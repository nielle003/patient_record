# 🦷 Patient Record System - Dental Practice Management

<div align="center">

![Ionic](https://img.shields.io/badge/Ionic-8.0-blue?style=for-the-badge&logo=ionic)
![Angular](https://img.shields.io/badge/Angular-20.0-red?style=for-the-badge&logo=angular)
![Capacitor](https://img.shields.io/badge/Capacitor-6.2-blue?style=for-the-badge&logo=capacitor)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![SQLite](https://img.shields.io/badge/SQLite-3.0-blue?style=for-the-badge&logo=sqlite)

A professional, full-featured mobile application for dental practice management with offline-first architecture and comprehensive patient record tracking.

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Architecture](#-architecture) 

</div>

---

## 📋 Project Overview

The **Patient Record System** is a production-ready mobile application designed specifically for dental practices. Built with modern web technologies and following industry best practices, it provides a complete solution for managing patient records, visit history, payment tracking, and clinical documentation—all while working seamlessly offline.

### Key Highlights

- 🎯 **100% Offline Capable** - Full SQLite database with WAL mode for data integrity
- 📱 **Cross-Platform** - Single codebase for iOS and Android via Capacitor
- 🔒 **Secure Authentication** - User management with encrypted password storage (SHA-256)
- 📸 **Image Management** - Camera integration for X-ray and clinical photos
- 💾 **Data Backup** - Complete database export/import functionality
- 🎨 **Modern UI/UX** - Material Design with Ionic components

---

## ✨ Features

### Patient Management
- **Comprehensive Patient Profiles**
  - Personal information (name, gender, birthday, contact)
  - Employment details (occupation, company)
  - Insurance information (HMO provider and number)
  - Valid ID documentation tracking
- **Advanced Search** - Real-time patient search with pagination
- **CRUD Operations** - Full create, read, update, and delete capabilities

### Visit Tracking
- **Detailed Visit Records**
  - Procedure documentation with multiple treatment types
  - Date and time tracking
  - Clinical notes and comments
  - Payment mode selection (one-time or installment)
- **Photo Attachments**
  - Camera integration for taking clinical photos
  - Gallery selection for importing existing images
  - Image viewer with zoom and pan capabilities
  - Persistent storage using Capacitor Filesystem API

### Payment Management
- **Flexible Payment Tracking**
  - Multiple payment entries per visit
  - Payment method options (Cash, Credit Card, Insurance, Other)
  - Real-time balance calculation
  - Payment history with notes
- **Financial Overview**
  - Total cost tracking
  - Total paid calculation
  - Outstanding balance monitoring
  - Payment status indicators

### Data Management
- **Database Backup & Restore**
  - Export tables to JSON format
  - Share backup files via native share sheet
  - Import functionality for data restoration
  - Table-by-table or complete database backup
- **Data Integrity**
  - SQLite with WAL (Write-Ahead Logging) mode
  - Foreign key constraints
  - Transaction support
  - Automated database initialization

### Authentication & Security
- **User Management**
  - Secure registration with password encryption
  - Session management
  - Username uniqueness validation
  - SHA-256 password hashing

---

## 🛠 Tech Stack

### Frontend Framework
- **Ionic 8.0** - Mobile UI components and navigation
- **Angular 20.0** - Application framework with standalone components
- **TypeScript 5.0** - Type-safe development
- **RxJS 7.8** - Reactive programming

### Mobile Runtime
- **Capacitor 6.2** - Native mobile bridge
- **Capacitor Plugins:**
  - Camera - Photo capture and selection
  - Filesystem - File management and storage
  - Share - Native sharing functionality
  - Status Bar - UI customization
  - Haptics - Tactile feedback
  - Keyboard - Input optimization

### Database & Storage
- **@capacitor-community/sqlite 6.0** - SQLite database management
- **jeep-sqlite 2.8** - SQLite Web implementation
- **WAL Mode** - Write-Ahead Logging for data integrity

### Development Tools
- **Angular CLI 20.0** - Build tooling
- **ESLint** - Code quality and consistency
- **Karma/Jasmine** - Testing framework

---

## 🏗 Architecture

### Design Patterns
- **Service-Oriented Architecture** - Separated business logic into dedicated services
- **Standalone Components** - Modern Angular architecture without NgModules
- **Reactive Programming** - RxJS observables for async operations
- **Repository Pattern** - Database abstraction layer

### Project Structure
```
src/
├── app/
│   ├── services/           # Business logic services
│   │   ├── database.ts     # Core SQLite operations
│   │   ├── patient.ts      # Patient CRUD operations
│   │   ├── visit.ts        # Visit management
│   │   ├── payment.ts      # Payment tracking
│   │   ├── photo.ts        # Image handling
│   │   └── user.ts         # Authentication
│   ├── home/               # Dashboard page
│   ├── login/              # Authentication page
│   ├── register/           # User registration
│   ├── addpatient/         # Patient creation/editing
│   ├── viewpatient/        # Patient details & history
│   ├── addvisit/           # Visit creation
│   └── backup/             # Data backup/restore
├── assets/                 # Static resources
├── theme/                  # Global styling
└── environments/           # Environment configs
```

### Database Schema
- **users** - Authentication and user management
- **patients** - Patient demographic and insurance data
- **visits** - Visit records with procedures and costs
- **payments** - Payment transactions and history
- **Foreign Keys** - Referential integrity between tables
- **Indexes** - Optimized query performance

---

## 🚀 Installation

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd patient_record_system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Add mobile platforms**
   ```bash
   # For Android
   npx ionic cap add android
   
   # For iOS (macOS only)
   npx ionic cap add ios
   ```

4. **Run in development**
   ```bash
   # Web browser (limited SQLite support)
   npm start
   
   # Android device/emulator
   ionic cap run android
   
   # iOS device/simulator
   ionic cap run ios
   ```

5. **Build for production**
   ```bash
   # Build web assets
   npm run build
   
   # Sync to native platforms
   npx cap sync
   
   # Open in IDE for release builds
   npx cap open android
   npx cap open ios
   ```

---

## 📱 Usage

### First-Time Setup
1. **Registration** - Create an account on the registration page
2. **Login** - Sign in with your credentials
3. **Add Patients** - Navigate to "Add Patient" and enter patient details
4. **Create Visits** - Select a patient and create visit records
5. **Track Payments** - Record payments against visits

### Monthly Backup Reminder
The app automatically reminds users on the 15th of each month to perform database backups.

### Data Export/Import
1. Navigate to the **Backup** page
2. Select tables to export
3. Use the **Share** functionality to save/send backup files
4. Import previously exported files to restore data

---

## 🔍 Technical Highlights

### Performance Optimizations
- **Lazy Loading** - Route-based code splitting
- **Pagination** - Efficient large dataset handling
- **Image Optimization** - Webp format with compression
- **SQLite Indexing** - Optimized database queries
- **Virtual Scrolling** - Memory-efficient list rendering

### Best Practices
- **Type Safety** - Full TypeScript coverage
- **Error Handling** - Comprehensive try-catch blocks with user feedback
- **Async/Await** - Clean asynchronous code
- **Component Isolation** - Standalone components with clear boundaries
- **Service Injection** - Dependency injection pattern
- **Reactive Forms** - Two-way data binding with ngModel

### Security Features
- **Password Encryption** - SHA-256 hashing
- **SQL Injection Prevention** - Parameterized queries
- **Session Management** - Secure authentication state
- **Data Validation** - Input sanitization and validation

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run e2e tests
npm run e2e

# Lint code
npm run lint
```

---

## 🚧 Future Enhancements

### Planned Features
- [ ] Cloud synchronization with backend API
- [ ] Multi-user role management (Admin, Dentist, Assistant)
- [ ] Appointment scheduling system
- [ ] SMS/Email reminders for appointments
- [ ] Treatment plan templates
- [ ] Invoice generation and printing
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Biometric authentication

### Technical Improvements
- [ ] Unit test coverage (target: 80%+)
- [ ] E2E testing with Cypress
- [ ] Progressive Web App (PWA) support
- [ ] Real-time data sync with WebSocket
- [ ] GraphQL API integration
- [ ] Docker containerization
- [ ] CI/CD pipeline setup

---

## 📄 License

This project is proprietary software developed for dental practice management.

---

## 👤 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- **Ionic Framework** - For the excellent mobile UI toolkit
- **Angular Team** - For the robust application framework
- **Capacitor Community** - For native plugin development
- **SQLite** - For reliable embedded database

---

<div align="center">

### Built with ❤️ for dental professionals

**Made with Ionic, Angular, and TypeScript**

</div>
