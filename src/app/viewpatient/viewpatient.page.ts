import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
  IonSearchbar,
  IonModal,
  IonTextarea,
  IonInput,
  IonSelect,
  IonSelectOption,
  AlertController,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { camera, images, imagesOutline, close, arrowBack, transgender, calendar, shieldCheckmark, chevronDown, chevronBack, chevronForward, peopleOutline, create, trash, wallet, addCircle, add, remove, contract, calendarOutline } from 'ionicons/icons';
import { PatientService, Patient } from '../services/patient';
import { VisitService, Visit } from '../services/visit';
import { PaymentService, Payment } from '../services/payment';
import { PhotoService } from '../services/photo';

@Component({
  selector: 'app-viewpatient',
  templateUrl: './viewpatient.page.html',
  styleUrls: ['./viewpatient.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonText,
    IonSearchbar,
    IonModal,
    IonTextarea,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonIcon
  ]
})
export class ViewpatientPage implements OnInit {
  Math = Math  // For use in template
  paginatedPatients: Patient[] = []
  selectedPatient: Patient | null = null
  visits: Visit[] = []
  searchTerm = ''
  isSearching = false

  // Pagination properties
  currentPage: number = 0  // 0-indexed for database queries
  itemsPerPage: number = 10
  totalPages: number = 1
  totalCount: number = 0

  selectedVisit: Visit | null = null
  payments: Payment[] = []
  showPaymentForm = false
  showEditVisitForm = false
  showEditPaymentForm = false
  editingVisit: Visit | null = null
  editingPayment: Payment | null = null

  // Image viewer properties
  showImageViewer = false
  currentImageUrl = ''
  zoomLevel = 1
  panX = 0
  panY = 0
  private lastTouchDistance = 0
  private lastTouchX = 0
  private lastTouchY = 0
  newPayment: Payment = {
    visitId: 0,
    firstName: '',
    lastName: '',
    amount: 0,
    paymentDate: new Date().toISOString(),
    paymentMethod: 'Cash',
    notes: ''
  }

  procedures = [
    'Consultation',
    'Oral Prophylaxis',
    'Restoration',
    'Extraction',
    'Odontectomy',
    'Deep Scaling',
    'Frenectomy',
    'Root Canal Treatment',
    'Orthodontic Treatment',
    'Implant',
    'Bonegrafting',
    'Build up',
    'Denture',
    'Fixed Bridge',
    'Jacket Crown',
    'Veneers'
  ]

  paymentModes = [
    'One-time Payment',
    'Installment'
  ]

  constructor(
    private patientService: PatientService,
    private visitService: VisitService,
    private paymentService: PaymentService,
    private photoService: PhotoService,
    private router: Router,
    private alertController: AlertController
  ) {
    // Register all icons used in this page
    addIcons({
      camera,
      images,
      'images-outline': imagesOutline,
      close,
      'arrow-back': arrowBack,
      transgender,
      calendar,
      'calendar-outline': calendarOutline,
      'shield-checkmark': shieldCheckmark,
      'chevron-down': chevronDown,
      'chevron-back': chevronBack,
      'chevron-forward': chevronForward,
      'people-outline': peopleOutline,
      create,
      trash,
      wallet,
      'add-circle': addCircle,
      add,
      remove,
      contract
    });
  }

  async ngOnInit() {
    await this.loadPatients()
  }

  async loadPatients() {
    try {
      // Load first page from database
      this.currentPage = 0
      this.totalCount = await this.patientService.getPatientsCount()
      this.totalPages = Math.ceil(this.totalCount / this.itemsPerPage)
      await this.loadCurrentPage()
      console.log(`Loaded page 1 of ${this.totalPages} (${this.totalCount} total patients)`)
    } catch (error) {
      console.error('Error loading patients:', error)
      alert('Failed to load patients')
    }
  }

  async loadCurrentPage() {
    if (this.searchTerm.trim()) {
      // Load search results
      this.paginatedPatients = await this.patientService.searchPatientsPaginated(
        this.searchTerm,
        this.currentPage,
        this.itemsPerPage
      )
    } else {
      // Load regular page
      this.paginatedPatients = await this.patientService.getPatientsPaginated(
        this.currentPage,
        this.itemsPerPage
      )
    }
  }

  async handleSearch(event: any) {
    const query = event.target.value.trim()
    this.searchTerm = query
    this.currentPage = 0

    try {
      this.isSearching = true

      if (query === '') {
        // Load all patients paginated
        this.totalCount = await this.patientService.getPatientsCount()
      } else {
        // Search database
        this.totalCount = await this.patientService.getSearchResultsCount(query)
      }

      this.totalPages = Math.ceil(this.totalCount / this.itemsPerPage)
      await this.loadCurrentPage()

      console.log(`Search "${query}" found ${this.totalCount} results`)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      this.isSearching = false
    }
  }

  async selectPatient(patient: Patient) {
    this.selectedPatient = patient
    if (patient.id) {
      this.visits = await this.visitService.getVisitsByPatient(patient.id)
      console.log('Loaded visits:', this.visits)
    }
  }

  backToList() {
    this.selectedPatient = null
    this.visits = []  // Clear visits to free memory
    this.selectedVisit = null
    this.payments = []  // Clear payments to free memory
  }

  async nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++
      await this.loadCurrentPage()
    }
  }

  async previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--
      await this.loadCurrentPage()
    }
  }

  async goToPage(page: number) {
    // page is 1-indexed from UI, convert to 0-indexed
    const pageIndex = page - 1
    if (pageIndex >= 0 && pageIndex < this.totalPages) {
      this.currentPage = pageIndex
      await this.loadCurrentPage()
    }
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1)
  }

  get displayPage(): number {
    return this.currentPage + 1  // Convert 0-indexed to 1-indexed for display
  }

  editPatient(patient: Patient) {
    if (patient.id) {
      this.router.navigate(['/addpatient', patient.id])
    }
  }

  async viewPayments(visit: Visit) {
    this.selectedVisit = visit
    if (visit.id) {
      this.payments = await this.paymentService.getPaymentsByVisit(visit.id)
      console.log('Loaded payments:', this.payments)
    }
  }

  closePayments() {
    this.selectedVisit = null
    this.payments = []
    this.showPaymentForm = false
    this.router.navigate(['/viewpatient'])
  }

  openPaymentForm(visit: Visit) {
    this.selectedVisit = visit
    this.showPaymentForm = true
    this.newPayment = {
      visitId: visit.id || 0,
      firstName: visit.firstName,
      lastName: visit.lastName,
      amount: 0,
      paymentDate: new Date().toISOString(),
      paymentMethod: 'Cash',
      notes: ''
    }
  }

  async addPayment() {
    if (!this.newPayment.amount || this.newPayment.amount <= 0) {
      alert('Please enter a valid payment amount')
      return
    }

    if (!this.selectedVisit || !this.selectedVisit.id) {
      alert('No visit selected')
      return
    }

    try {
      const paymentId = await this.paymentService.addPayment(this.newPayment)
      if (paymentId > 0) {
        alert('Payment added successfully!')
        // Reload visit data to get updated balance
        if (this.selectedPatient && this.selectedPatient.id) {
          this.visits = await this.visitService.getVisitsByPatient(this.selectedPatient.id)
          this.selectedVisit = this.visits.find(v => v.id === this.selectedVisit?.id) || null
        }
        // Reload payments
        if (this.selectedVisit && this.selectedVisit.id) {
          this.payments = await this.paymentService.getPaymentsByVisit(this.selectedVisit.id)
        }
        this.showPaymentForm = false
      } else {
        alert('Failed to add payment')
      }
    } catch (err) {
      console.error('Error adding payment:', err)
      alert('Error adding payment: ' + (err as Error).message)
    }
  }

  cancelPayment() {
    this.showPaymentForm = false
    if (!this.showEditPaymentForm) {
      this.router.navigate(['/viewpatient'])
    }
  }

  openEditVisit(visit: Visit) {
    this.editingVisit = { ...visit }
    this.showEditVisitForm = true
  }

  cancelEditVisit() {
    this.editingVisit = null
    this.showEditVisitForm = false
  }

  async updateVisit() {
    if (!this.editingVisit) return

    // Validate required fields
    if (!this.editingVisit.procedureDone) {
      alert('Please select a procedure')
      return
    }
    if (!this.editingVisit.modeOfPayment) {
      alert('Please select mode of payment')
      return
    }
    if (!this.editingVisit.dateOfVisit) {
      alert('Please select date of visit')
      return
    }

    // Recalculate balance
    this.editingVisit.balance = this.editingVisit.totalCost - this.editingVisit.totalPaid

    try {
      const success = await this.visitService.updateVisit(this.editingVisit)
      if (success) {
        alert('Visit updated successfully!')
        // Reload visits
        if (this.selectedPatient && this.selectedPatient.id) {
          this.visits = await this.visitService.getVisitsByPatient(this.selectedPatient.id)
        }
        this.showEditVisitForm = false
        this.editingVisit = null
      } else {
        alert('Failed to update visit')
      }
    } catch (err) {
      console.error('Error updating visit:', err)
      alert('Error updating visit: ' + (err as Error).message)
    }
  }

  async deleteVisit(visit: Visit) {
    const confirmAlert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete this visit? This will also delete all associated payment records.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              if (visit.id) {
                // First delete all payments for this visit
                await this.paymentService.deletePaymentsByVisit(visit.id)
                // Then delete the visit
                const success = await this.visitService.deleteVisit(visit.id)
                if (success) {
                  window.alert('Visit deleted successfully!')
                  // Reload visits
                  if (this.selectedPatient && this.selectedPatient.id) {
                    this.visits = await this.visitService.getVisitsByPatient(this.selectedPatient.id)
                  }
                } else {
                  window.alert('Failed to delete visit')
                }
              }
            } catch (err) {
              console.error('Error deleting visit:', err)
              window.alert('Error deleting visit: ' + (err as Error).message)
            }
          }
        }
      ]
    })

    await confirmAlert.present()
  }

  openEditPayment(payment: Payment) {
    this.editingPayment = { ...payment }
    this.showEditPaymentForm = true
  }

  cancelEditPayment() {
    this.editingPayment = null
    this.showEditPaymentForm = false
  }

  async updatePayment() {
    if (!this.editingPayment) return

    // Validate required fields
    if (!this.editingPayment.amount || this.editingPayment.amount <= 0) {
      alert('Please enter a valid payment amount')
      return
    }
    if (!this.editingPayment.paymentMethod) {
      alert('Please select a payment method')
      return
    }
    if (!this.editingPayment.paymentDate) {
      alert('Please select a payment date')
      return
    }

    try {
      const success = await this.paymentService.updatePayment(this.editingPayment)
      if (success) {
        alert('Payment updated successfully!')
        // Reload visit data to get updated balance
        if (this.selectedPatient && this.selectedPatient.id) {
          this.visits = await this.visitService.getVisitsByPatient(this.selectedPatient.id)
          this.selectedVisit = this.visits.find(v => v.id === this.selectedVisit?.id) || null
        }
        // Reload payments
        if (this.selectedVisit && this.selectedVisit.id) {
          this.payments = await this.paymentService.getPaymentsByVisit(this.selectedVisit.id)
        }
        this.showEditPaymentForm = false
        this.editingPayment = null
      } else {
        alert('Failed to update payment')
      }
    } catch (err) {
      console.error('Error updating payment:', err)
      alert('Error updating payment: ' + (err as Error).message)
    }
  }

  async deletePayment(payment: Payment) {
    const confirmAlert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete this payment of ₱${payment.amount.toFixed(2)}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              if (payment.id && payment.visitId) {
                const success = await this.paymentService.deletePayment(payment.id, payment.visitId)
                if (success) {
                  window.alert('Payment deleted successfully!')
                  // Reload visit data to get updated balance
                  if (this.selectedPatient && this.selectedPatient.id) {
                    this.visits = await this.visitService.getVisitsByPatient(this.selectedPatient.id)
                    this.selectedVisit = this.visits.find(v => v.id === this.selectedVisit?.id) || null
                  }
                  // Reload payments
                  if (this.selectedVisit && this.selectedVisit.id) {
                    this.payments = await this.paymentService.getPaymentsByVisit(this.selectedVisit.id)
                  }
                } else {
                  window.alert('Failed to delete payment')
                }
              }
            } catch (err) {
              console.error('Error deleting payment:', err)
              window.alert('Error deleting payment: ' + (err as Error).message)
            }
          }
        }
      ]
    })

    await confirmAlert.present()
  }

  async deletePatient(patient: Patient) {
    const confirmAlert = await this.alertController.create({
      header: 'Confirm Delete',
      message: `Are you sure you want to delete ${patient.firstName} ${patient.lastName}? This will permanently delete all visit records and payment history for this patient.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              if (patient.id) {
                const success = await this.patientService.deletePatient(patient.id)
                if (success) {
                  window.alert('Patient deleted successfully!')
                  // Go back to patient list
                  this.backToList()
                  // Reload patients
                  await this.loadPatients()
                } else {
                  window.alert('Failed to delete patient')
                }
              }
            } catch (err) {
              console.error('Error deleting patient:', err)
              window.alert('Error deleting patient: ' + (err as Error).message)
            }
          }
        }
      ]
    })

    await confirmAlert.present()
  }

  getAge(birthday: string): number {
    const birthDate = new Date(birthday)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  loadPhoto(filepath: string): string {
    return this.photoService.loadPhoto(filepath)
  }

  async viewFullImage(filepath: string) {
    this.currentImageUrl = this.photoService.loadPhoto(filepath)
    this.showImageViewer = true
    this.resetZoom()
    console.log('🖼️ Viewing image:', this.currentImageUrl)
  }

  closeImageViewer() {
    this.showImageViewer = false
    this.resetZoom()
  }

  zoomIn() {
    this.zoomLevel = Math.min(this.zoomLevel + 0.5, 5)
  }

  zoomOut() {
    this.zoomLevel = Math.max(this.zoomLevel - 0.5, 1)
    if (this.zoomLevel === 1) {
      this.panX = 0
      this.panY = 0
    }
  }

  resetZoom() {
    this.zoomLevel = 1
    this.panX = 0
    this.panY = 0
  }

  toggleZoom() {
    if (this.zoomLevel === 1) {
      this.zoomLevel = 2
    } else {
      this.resetZoom()
    }
  }

  handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      // Pinch to zoom
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      this.lastTouchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
    } else if (event.touches.length === 1) {
      // Pan
      this.lastTouchX = event.touches[0].clientX
      this.lastTouchY = event.touches[0].clientY
    }
  }

  handleTouchMove(event: TouchEvent) {
    event.preventDefault()

    if (event.touches.length === 2) {
      // Pinch to zoom
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )

      if (this.lastTouchDistance > 0) {
        const scale = currentDistance / this.lastTouchDistance
        this.zoomLevel = Math.max(1, Math.min(5, this.zoomLevel * scale))
      }

      this.lastTouchDistance = currentDistance
    } else if (event.touches.length === 1 && this.zoomLevel > 1) {
      // Pan when zoomed
      const deltaX = event.touches[0].clientX - this.lastTouchX
      const deltaY = event.touches[0].clientY - this.lastTouchY

      this.panX += deltaX / this.zoomLevel
      this.panY += deltaY / this.zoomLevel

      this.lastTouchX = event.touches[0].clientX
      this.lastTouchY = event.touches[0].clientY
    }
  }

  handleTouchEnd(event: TouchEvent) {
    if (event.touches.length < 2) {
      this.lastTouchDistance = 0
    }
    if (this.zoomLevel === 1) {
      this.panX = 0
      this.panY = 0
    }
  }

  async takePhotoForVisit(visit: Visit) {
    try {
      // Check photo limit (max 5 photos per visit)
      const currentPhotoCount = visit.attachments?.length || 0
      if (currentPhotoCount >= 5) {
        window.alert('Maximum 5 photos allowed per visit. Please delete existing photos to add new ones.')
        return
      }

      console.log('📸 Taking photo for visit:', visit.id)
      console.log('📸 Patient ID:', this.selectedPatient?.id)
      console.log('📸 Visit ID:', visit.id)
      const photo = await this.photoService.takePhoto(this.selectedPatient?.id, visit.id)
      if (photo) {
        console.log('✅ Photo captured:', photo)
        console.log('💾 Photo saved to:', photo.filepath)

        // Update visit attachments - create new array reference
        if (!visit.attachments) {
          visit.attachments = []
        }
        visit.attachments = [...visit.attachments, photo.filepath]

        // Update visit in database
        await this.visitService.updateVisit(visit)
        console.log('✅ Visit updated with new photo')

        // Reload visits to refresh UI
        if (this.selectedPatient?.id) {
          this.visits = await this.visitService.getVisitsByPatient(this.selectedPatient.id)
        }
      }
    } catch (err) {
      console.error('Error taking photo:', err)
      window.alert('Error taking photo: ' + (err as Error).message)
    }
  }

  async selectPhotoForVisit(visit: Visit) {
    try {
      // Check photo limit (max 5 photos per visit)
      const currentPhotoCount = visit.attachments?.length || 0
      if (currentPhotoCount >= 5) {
        window.alert('Maximum 5 photos allowed per visit. Please delete existing photos to add new ones.')
        return
      }

      console.log('🖼️ Selecting photo for visit:', visit.id)
      console.log('🖼️ Patient ID:', this.selectedPatient?.id)
      console.log('🖼️ Visit ID:', visit.id)
      const photo = await this.photoService.selectPhoto(this.selectedPatient?.id, visit.id)
      if (photo) {
        console.log('✅ Photo selected:', photo)
        console.log('💾 Photo saved to:', photo.filepath)

        // Update visit attachments - create new array reference
        if (!visit.attachments) {
          visit.attachments = []
        }
        visit.attachments = [...visit.attachments, photo.filepath]

        // Update visit in database
        await this.visitService.updateVisit(visit)
        console.log('✅ Visit updated with new photo')

        // Reload visits to refresh UI
        if (this.selectedPatient?.id) {
          this.visits = await this.visitService.getVisitsByPatient(this.selectedPatient.id)
        }
      }
    } catch (err) {
      console.error('Error selecting photo:', err)
      window.alert('Error selecting photo: ' + (err as Error).message)
    }
  }

  async deletePhotoFromVisit(visit: Visit, filepath: string) {
    const confirmAlert = await this.alertController.create({
      header: 'Delete Photo',
      message: 'Are you sure you want to delete this image?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              console.log('🗑️ Deleting photo:', filepath)

              // Delete photo file from storage
              await this.photoService.deletePhoto(filepath)
              console.log('✅ Photo file deleted')

              // Remove from visit attachments
              if (visit.attachments) {
                visit.attachments = visit.attachments.filter(path => path !== filepath)
              }

              // Update visit in database
              await this.visitService.updateVisit(visit)
              console.log('✅ Visit updated after photo deletion')

              // Reload visits to refresh UI
              if (this.selectedPatient?.id) {
                this.visits = await this.visitService.getVisitsByPatient(this.selectedPatient.id)
              }
            } catch (err) {
              console.error('Error deleting photo:', err)
              window.alert('Error deleting photo: ' + (err as Error).message)
            }
          }
        }
      ]
    })

    await confirmAlert.present()
  }
}
