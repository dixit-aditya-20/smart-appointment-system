// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    Timestamp,
    addDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDsgQMnfJe48aoecO64BjLTNc4F1UtXOuE",
    authDomain: "smart-appointment-system-af3e9.firebaseapp.com",
    projectId: "smart-appointment-system-af3e9",
    storageBucket: "smart-appointment-system-af3e9.firebasestorage.app",
    messagingSenderId: "260174300898",
    appId: "1:260174300898:web:3b0082bfbe858d5235c0bb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
const auth = getAuth(app);
const db = getFirestore(app);

// Collection References
const usersCollection = collection(db, "users");
const appointmentsCollection = collection(db, "appointments");
const doctorsCollection = collection(db, "doctors");

// User Roles
const USER_ROLES = {
    PATIENT: "patient",
    DOCTOR: "doctor",
    ADMIN: "admin"
};

// Helper Functions

// Create or update user profile
async function createUserProfile(userId, userData) {
    try {
        const userRef = doc(db, "users", userId);
        await setDoc(userRef, {
            ...userData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            role: userData.role || USER_ROLES.PATIENT
        }, { merge: true });
        console.log("✅ User profile created/updated");
        return true;
    } catch (error) {
        console.error("Error creating user profile:", error);
        return false;
    }
}

// Get user profile
async function getUserProfile(userId) {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            return { id: userSnap.id, ...userSnap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error getting user profile:", error);
        return null;
    }
}

// Get user role
async function getUserRole(userId) {
    const profile = await getUserProfile(userId);
    return profile?.role || USER_ROLES.PATIENT;
}

// Check if user is a doctor
async function isDoctor(userId) {
    const role = await getUserRole(userId);
    return role === USER_ROLES.DOCTOR;
}

// Check if user is an admin
async function isAdmin(userId) {
    const role = await getUserRole(userId);
    return role === USER_ROLES.ADMIN;
}

// Get all doctors
async function getAllDoctors() {
    try {
        const q = query(usersCollection, where("role", "==", USER_ROLES.DOCTOR));
        const snapshot = await getDocs(q);
        const doctors = [];
        snapshot.forEach(doc => {
            doctors.push({ id: doc.id, ...doc.data() });
        });
        return doctors;
    } catch (error) {
        console.error("Error getting doctors:", error);
        return [];
    }
}

// Get appointments for a specific doctor
async function getDoctorAppointments(doctorName, status = null) {
    try {
        let q = query(appointmentsCollection, where("doctor", "==", doctorName));
        
        if (status) {
            q = query(appointmentsCollection, where("doctor", "==", doctorName), where("status", "==", status));
        }
        
        const snapshot = await getDocs(q);
        const appointments = [];
        snapshot.forEach(doc => {
            appointments.push({ id: doc.id, ...doc.data() });
        });
        return appointments;
    } catch (error) {
        console.error("Error getting doctor appointments:", error);
        return [];
    }
}

// Get appointments for a specific user
async function getUserAppointments(userId) {
    try {
        const q = query(appointmentsCollection, where("userId", "==", userId), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const appointments = [];
        snapshot.forEach(doc => {
            appointments.push({ id: doc.id, ...doc.data() });
        });
        return appointments;
    } catch (error) {
        console.error("Error getting user appointments:", error);
        return [];
    }
}

// Book an appointment
async function bookAppointment(appointmentData) {
    try {
        const docRef = await addDoc(appointmentsCollection, {
            ...appointmentData,
            createdAt: Timestamp.now(),
            status: "active",
            queuePosition: null,
            waitMinutes: null
        });
        console.log("✅ Appointment booked with ID:", docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error booking appointment:", error);
        return { success: false, error: error.message };
    }
}

// Update appointment status
async function updateAppointmentStatus(appointmentId, status, additionalData = {}) {
    try {
        const appointmentRef = doc(db, "appointments", appointmentId);
        await updateDoc(appointmentRef, {
            status: status,
            updatedAt: Timestamp.now(),
            ...additionalData
        });
        console.log(`✅ Appointment ${appointmentId} updated to ${status}`);
        return { success: true };
    } catch (error) {
        console.error("Error updating appointment:", error);
        return { success: false, error: error.message };
    }
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
    return updateAppointmentStatus(appointmentId, "cancelled", { cancelledAt: Timestamp.now() });
}

// Complete appointment with prescription
async function completeAppointment(appointmentId, prescription) {
    return updateAppointmentStatus(appointmentId, "completed", {
        completedAt: Timestamp.now(),
        prescription: prescription
    });
}

// Reschedule appointment
async function rescheduleAppointment(appointmentId, newDate, newTime) {
    try {
        const appointmentRef = doc(db, "appointments", appointmentId);
        const appointmentSnap = await getDoc(appointmentRef);
        
        if (!appointmentSnap.exists()) {
            return { success: false, error: "Appointment not found" };
        }
        
        const oldData = appointmentSnap.data();
        
        await updateDoc(appointmentRef, {
            date: newDate,
            time: newTime,
            rescheduledAt: Timestamp.now(),
            previousDate: oldData.date,
            previousTime: oldData.time,
            status: "active"
        });
        
        console.log(`✅ Appointment ${appointmentId} rescheduled to ${newDate} at ${newTime}`);
        return { success: true };
    } catch (error) {
        console.error("Error rescheduling appointment:", error);
        return { success: false, error: error.message };
    }
}

// Get live queue for a doctor (real-time)
function subscribeToDoctorQueue(doctorName, callback) {
    const q = query(
        appointmentsCollection,
        where("doctor", "==", doctorName),
        where("status", "==", "active"),
        orderBy("date", "asc"),
        orderBy("time", "asc")
    );
    
    return onSnapshot(q, (snapshot) => {
        const appointments = [];
        snapshot.forEach(doc => {
            appointments.push({ id: doc.id, ...doc.data() });
        });
        callback(appointments);
    }, (error) => {
        console.error("Error in queue subscription:", error);
    });
}

// Get today's appointments for a doctor
async function getTodayAppointments(doctorName) {
    const today = new Date().toISOString().split('T')[0];
    try {
        const q = query(
            appointmentsCollection,
            where("doctor", "==", doctorName),
            where("date", "==", today),
            orderBy("time", "asc")
        );
        const snapshot = await getDocs(q);
        const appointments = [];
        snapshot.forEach(doc => {
            appointments.push({ id: doc.id, ...doc.data() });
        });
        return appointments;
    } catch (error) {
        console.error("Error getting today's appointments:", error);
        return [];
    }
}

// Auth wrapper functions
async function signUpWithEmail(email, password, userData) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Send verification email
        await sendEmailVerification(user);
        
        // Create user profile
        await createUserProfile(user.uid, {
            email: email,
            name: userData.name,
            phone: userData.phone,
            role: USER_ROLES.PATIENT,
            emailVerified: false
        });
        
        return { success: true, user };
    } catch (error) {
        console.error("Signup error:", error);
        return { success: false, error: error.message };
    }
}

async function signInWithEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, error: error.message };
    }
}

async function logoutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error("Logout error:", error);
        return { success: false, error: error.message };
    }
}

// Debug info
console.log("🔥 Firebase Connected Successfully");
console.log("📁 Firestore initialized");
console.log("👤 Auth initialized");
console.log("👨‍⚕️ Doctor portal helpers loaded");

// Export all functions and constants
export { 
    auth, 
    db,
    usersCollection,
    appointmentsCollection,
    doctorsCollection,
    USER_ROLES,
    createUserProfile,
    getUserProfile,
    getUserRole,
    isDoctor,
    isAdmin,
    getAllDoctors,
    getDoctorAppointments,
    getUserAppointments,
    bookAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    completeAppointment,
    rescheduleAppointment,
    subscribeToDoctorQueue,
    getTodayAppointments,
    signUpWithEmail,
    signInWithEmail,
    logoutUser,
    Timestamp,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile
};

// Add these functions to your existing firebase.js file

// Patient Profile Functions
async function createPatientProfile(userId, patientData) {
    try {
        const patientRef = doc(db, "patients", userId);
        await setDoc(patientRef, {
            ...patientData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            medicalHistory: patientData.medicalHistory || [],
            allergies: patientData.allergies || [],
            medications: patientData.medications || []
        }, { merge: true });
        console.log("✅ Patient profile created/updated");
        return true;
    } catch (error) {
        console.error("Error creating patient profile:", error);
        return false;
    }
}

async function getPatientProfile(userId) {
    try {
        const patientRef = doc(db, "patients", userId);
        const patientSnap = await getDoc(patientRef);
        if (patientSnap.exists()) {
            return { id: patientSnap.id, ...patientSnap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error getting patient profile:", error);
        return null;
    }
}

async function updatePatientProfile(userId, updateData) {
    try {
        const patientRef = doc(db, "patients", userId);
        await updateDoc(patientRef, {
            ...updateData,
            updatedAt: Timestamp.now()
        });
        console.log("✅ Patient profile updated");
        return { success: true };
    } catch (error) {
        console.error("Error updating patient profile:", error);
        return { success: false, error: error.message };
    }
}

// Doctor Profile Functions
async function getDoctorProfile(doctorId) {
    try {
        const doctorRef = doc(db, "doctors", doctorId);
        const doctorSnap = await getDoc(doctorRef);
        if (doctorSnap.exists()) {
            return { id: doctorSnap.id, ...doctorSnap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error getting doctor profile:", error);
        return null;
    }
}

async function getDoctorByEmail(email) {
    try {
        const q = query(usersCollection, where("email", "==", email), where("role", "==", USER_ROLES.DOCTOR));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error("Error getting doctor by email:", error);
        return null;
    }
}

// Add medical record functions
async function addMedicalRecord(userId, record) {
    try {
        const patientRef = doc(db, "patients", userId);
        const patientSnap = await getDoc(patientRef);
        const currentHistory = patientSnap.exists() ? patientSnap.data().medicalHistory || [] : [];
        
        await updateDoc(patientRef, {
            medicalHistory: [...currentHistory, {
                id: Date.now(),
                date: new Date().toISOString(),
                ...record
            }],
            updatedAt: Timestamp.now()
        });
        return { success: true };
    } catch (error) {
        console.error("Error adding medical record:", error);
        return { success: false, error: error.message };
    }
}

// Export new functions
export {
    // ... existing exports
    createPatientProfile,
    getPatientProfile,
    updatePatientProfile,
    getDoctorProfile,
    getDoctorByEmail,
    addMedicalRecord
};