import { Injectable } from '@angular/core'
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

export interface PhotoAttachment {
    filepath: string
    webviewPath?: string
    fileSize?: number // Size in bytes
}

export interface StorageInfo {
    totalFiles: number
    totalSize: number // Size in bytes
    sizeInMB: number
}

// Constants
const MAX_PHOTO_SIZE_MB = 25
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024 // 25MB in bytes

@Injectable({ providedIn: 'root' })
export class PhotoService {
    constructor() { }

    /**
     * Capture a photo using the camera
     */
    async takePhoto(patientId?: number, visitId?: number): Promise<PhotoAttachment | null> {
        try {
            console.log('📸 PhotoService: Taking photo...')
            const photo = await Camera.getPhoto({
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
                quality: 80, // Reduce quality to save space
                width: 1200, // Limit resolution for x-rays
                saveToGallery: false
            })
            console.log('📸 PhotoService: Photo captured, format:', photo.format)

            return await this.savePhoto(photo, patientId, visitId)
        } catch (error) {
            console.error('Error taking photo:', error)
            return null
        }
    }

    /**
     * Select a photo from gallery
     */
    async selectPhoto(patientId?: number, visitId?: number): Promise<PhotoAttachment | null> {
        try {
            console.log('🖼️ PhotoService: Selecting photo...')
            const photo = await Camera.getPhoto({
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Photos,
                quality: 80,
                width: 1200,
                saveToGallery: false
            })
            console.log('🖼️ PhotoService: Photo selected, format:', photo.format)

            return await this.savePhoto(photo, patientId, visitId)
        } catch (error) {
            console.error('Error selecting photo:', error)
            return null
        }
    }

    /**
     * Save photo to persistent storage
     */
    private async savePhoto(photo: Photo, patientId?: number, visitId?: number): Promise<PhotoAttachment> {
        // Validate file size before saving
        const fileSizeBytes = this.estimateBase64Size(photo.dataUrl!)
        const fileSizeMB = fileSizeBytes / (1024 * 1024)

        console.log(`📏 PhotoService: Estimated file size: ${fileSizeMB.toFixed(2)} MB`)

        if (fileSizeBytes > MAX_PHOTO_SIZE_BYTES) {
            throw new Error(`Photo size (${fileSizeMB.toFixed(2)} MB) exceeds the maximum allowed size of ${MAX_PHOTO_SIZE_MB} MB. Please choose a smaller image.`)
        }

        // Generate unique filename
        const fileName = `xray_${new Date().getTime()}.${photo.format}`
        console.log('💾 PhotoService: Saving to persistent storage, filename:', fileName)
        const savedFile = await this.saveToPersistentStorage(photo, fileName, patientId, visitId)
        console.log('✅ PhotoService: Saved successfully!')
        console.log('   filepath:', savedFile.filepath)
        console.log('   fileSize:', (savedFile.fileSize! / (1024 * 1024)).toFixed(2), 'MB')

        return savedFile
    }

    /**
     * Estimate file size from base64 data
     */
    private estimateBase64Size(base64Data: string): number {
        // Remove data URL prefix if present
        let data = base64Data
        if (data.includes(',')) {
            data = data.split(',')[1]
        }

        // Base64 encoding increases size by ~33%, so we reverse that
        // Also account for padding characters
        const padding = (data.match(/=/g) || []).length
        return (data.length * 3 / 4) - padding
    }

    /**
     * Save photo file to permanent storage
     */
    private async saveToPersistentStorage(photo: Photo, fileName: string, patientId?: number, visitId?: number): Promise<PhotoAttachment> {
        // photo.dataUrl contains the base64 data with DataUrl result type
        // Format: "data:image/jpeg;base64,/9j/4AAQ..." - we need to strip the prefix
        let base64Data = photo.dataUrl!
        console.log('💾 PhotoService: Original dataUrl length:', base64Data.length)

        // Strip the data URL prefix if present
        if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1]
            console.log('💾 PhotoService: Stripped base64 length:', base64Data.length)
        }

        // Calculate actual file size
        const fileSize = this.estimateBase64Size(photo.dataUrl!)

        // Build organized path: XRays/patient_123/visit_456/
        let photoPath = 'XRays'
        if (patientId) {
            photoPath += `/patient_${patientId}`
            if (visitId) {
                photoPath += `/visit_${visitId}`
            }
        }

        // Create directory structure if it doesn't exist
        try {
            await Filesystem.mkdir({
                path: photoPath,
                directory: Directory.Data,
                recursive: true
            })
            console.log('📁 Directory ready:', photoPath)
        } catch (error) {
            // Directory might already exist, which is fine
            console.log('📁 Directory check:', error)
        }

        const fullPath = `${photoPath}/${fileName}`
        console.log('💾 Writing file to:', fullPath)

        // Save to filesystem in app directory
        const savedFile = await Filesystem.writeFile({
            path: fullPath,
            data: base64Data,
            directory: Directory.Data
        })

        console.log('✅ File written, URI:', savedFile.uri)
        const webviewPath = Capacitor.convertFileSrc(savedFile.uri)
        console.log('✅ WebviewPath:', webviewPath)

        return {
            filepath: savedFile.uri,
            webviewPath: webviewPath,
            fileSize: fileSize
        }
    }

    /**
     * Read photo file as base64
     */
    private async readAsBase64(photo: Photo): Promise<string> {
        if (Capacitor.getPlatform() === 'web') {
            // Fetch the photo, read as blob, convert to base64
            const response = await fetch(photo.webPath!)
            const blob = await response.blob()
            return await this.convertBlobToBase64(blob) as string
        } else {
            // Read from filesystem
            const file = await Filesystem.readFile({
                path: photo.path!
            })
            return file.data as string
        }
    }

    /**
     * Convert blob to base64
     */
    private convertBlobToBase64(blob: Blob): Promise<string | ArrayBuffer | null> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onerror = reject
            reader.onload = () => {
                resolve(reader.result)
            }
            reader.readAsDataURL(blob)
        })
    }

    /**
     * Load photo from storage for display
     */
    loadPhoto(filepath: string): string {
        return Capacitor.convertFileSrc(filepath)
    }

    /**
     * Delete photo from storage
     */
    async deletePhoto(filepath: string): Promise<void> {
        try {
            // Extract path from URI
            const path = filepath.replace(/^file:\/\//, '')

            await Filesystem.deleteFile({
                path: path
            })
        } catch (error) {
            console.error('Error deleting photo:', error)
        }
    }

    /**
     * Delete multiple photos
     */
    async deletePhotos(filepaths: string[]): Promise<void> {
        for (const filepath of filepaths) {
            await this.deletePhoto(filepath)
        }
    }

    /**
     * Delete all photos for a specific visit
     */
    async deleteVisitPhotos(patientId: number, visitId: number): Promise<void> {
        try {
            const path = `XRays/patient_${patientId}/visit_${visitId}`
            console.log('🗑️ Deleting all photos in:', path)

            // Try to delete the entire visit directory
            await Filesystem.rmdir({
                path: path,
                directory: Directory.Data,
                recursive: true
            })
            console.log('✅ Visit photos deleted')
        } catch (error) {
            console.error('Error deleting visit photos:', error)
            // Not a critical error - directory might not exist or already be deleted
        }
    }

    /**
     * Get storage information for all photos
     */
    async getStorageInfo(): Promise<StorageInfo> {
        try {
            let totalFiles = 0
            let totalSize = 0

            // Read XRays directory
            const result = await Filesystem.readdir({
                path: 'XRays',
                directory: Directory.Data
            })

            // This is a simplified count - in production you'd recursively scan
            totalFiles = result.files.length

            // Note: Filesystem API doesn't provide file sizes directly
            // This is an approximation based on average file size
            const avgFileSizeMB = 0.3 // 300KB average
            totalSize = totalFiles * avgFileSizeMB * 1024 * 1024

            return {
                totalFiles,
                totalSize,
                sizeInMB: totalSize / (1024 * 1024)
            }
        } catch (error) {
            console.error('Error getting storage info:', error)
            return {
                totalFiles: 0,
                totalSize: 0,
                sizeInMB: 0
            }
        }
    }

    /**
     * Get photo count for a specific visit
     */
    async getVisitPhotoCount(patientId: number, visitId: number): Promise<number> {
        try {
            const path = `XRays/patient_${patientId}/visit_${visitId}`
            const result = await Filesystem.readdir({
                path: path,
                directory: Directory.Data
            })
            return result.files.length
        } catch (error) {
            // Directory doesn't exist or is empty
            return 0
        }
    }

    /**
     * Move photos from temp patient folder to specific visit folder
     * Used when creating a new visit - photos are saved to patient folder first,
     * then moved to visit folder after visit ID is created
     */
    async movePhotosToVisit(patientId: number, visitId: number, oldFilepaths: string[]): Promise<string[]> {
        const newFilepaths: string[] = []

        try {
            // Create visit directory
            const visitPath = `XRays/patient_${patientId}/visit_${visitId}`
            await Filesystem.mkdir({
                path: visitPath,
                directory: Directory.Data,
                recursive: true
            })
            console.log('📁 Created visit directory:', visitPath)

            // Move each photo
            for (const oldPath of oldFilepaths) {
                try {
                    // Extract filename from old path
                    const fileName = oldPath.split('/').pop() || oldPath.split('\\').pop()
                    if (!fileName) continue

                    // Read file from old location
                    const oldFilePath = oldPath.replace(/^file:\/\//, '')
                    const fileData = await Filesystem.readFile({
                        path: oldFilePath
                    })

                    // Write to new location
                    const newPath = `${visitPath}/${fileName}`
                    const savedFile = await Filesystem.writeFile({
                        path: newPath,
                        data: fileData.data,
                        directory: Directory.Data
                    })

                    newFilepaths.push(savedFile.uri)
                    console.log('📦 Moved photo:', fileName, '→', newPath)

                    // Delete old file
                    try {
                        await Filesystem.deleteFile({
                            path: oldFilePath
                        })
                    } catch (e) {
                        console.warn('Could not delete old photo:', e)
                    }
                } catch (error) {
                    console.error('Error moving photo:', error)
                    // Keep old path if move failed
                    newFilepaths.push(oldPath)
                }
            }

            return newFilepaths
        } catch (error) {
            console.error('Error in movePhotosToVisit:', error)
            // Return old paths if anything fails
            return oldFilepaths
        }
    }
}
