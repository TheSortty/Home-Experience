import { v4 as uuidv4 } from 'uuid';

// Types
export type RegistrationStatus = 'PENDING_REVIEW' | 'PENDING_PAYMENT' | 'APPROVED' | 'REJECTED' | 'DELETED';
export type StudentStatus = 'ACTIVE' | 'CONFLICT' | 'GRADUATED' | 'DROPPED';
export type PackageLevel = 'INICIAL' | 'AVANZADO' | 'PROGRAMA LIDER';
export type CycleStatus = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';

export interface Registration {
    id: string;
    name: string;
    email: string;
    date: string;
    status: RegistrationStatus;
    answers: { question: string; answer: string }[];
    selectedPackage: PackageLevel | 'COMBO INICIAL+AVANZADO' | 'FULL EXPERIENCE';
}

export interface CycleEvent {
    id: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    month: string;
    year: number;
    level: PackageLevel;
    enrolledCount: number;
    capacity: number;
    status: CycleStatus;
}

export interface Student {
    id: string;
    name: string;
    email: string;
    phone: string;
    pl: number;
    cycleId: string; // Links to CycleEvent
    currentPackage: PackageLevel;
    purchasedPackage: string;
    status: StudentStatus;
    progress: number;
    attendance: boolean[]; // Array of booleans for attendance
    nextPackageLocked: boolean;
    notes: string;
}

// Data Generator
const generateInitialData = () => {
    const cycles: CycleEvent[] = [];
    const students: Student[] = [];
    const registrations: Registration[] = [];

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const packageLevels: PackageLevel[] = ['INICIAL', 'AVANZADO', 'PROGRAMA LIDER'];
    const firstNames = ['Ana', 'Carlos', 'Sofia', 'Miguel', 'Lucia', 'Juan', 'Maria', 'Pedro', 'Valentina', 'Diego', 'Elena', 'Javier', 'Camila', 'Fernando', 'Isabella', 'Ricardo'];
    const lastNames = ['Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 'Torres', 'Flores', 'Rivera', 'Gomez', 'Diaz'];

    // 1. Generate Cycles for 2024-2025
    let currentMonthIndex = 0; // Start Jan 2024
    let dayOffset = 4; // First Thursday of 2024 approx

    for (let i = 1; i <= 40; i++) {
        const level = packageLevels[i % 3];
        const monthIndex = currentMonthIndex % 12;
        const monthName = months[monthIndex];
        const year = 2024 + Math.floor(currentMonthIndex / 12);

        const startDay = dayOffset;
        const endDay = dayOffset + 3;

        // Simple date formatting helper
        const formatDate = (y: number, m: number, d: number) => {
            const date = new Date(y, m, d);
            return date.toISOString().split('T')[0];
        };

        const startDate = formatDate(year, monthIndex, startDay);
        const endDate = formatDate(year, monthIndex, endDay);

        // Determine status based on "current date" simulation (assume late 2024)
        let status: CycleStatus = 'UPCOMING';
        if (year === 2024 && monthIndex < 10) status = 'COMPLETED';
        if (year === 2024 && monthIndex === 10) status = 'IN_PROGRESS';

        const cycleId = uuidv4();

        cycles.push({
            id: cycleId,
            startDate,
            endDate,
            month: monthName,
            year,
            level,
            enrolledCount: 0,
            capacity: level === 'INICIAL' ? 30 : 20,
            status
        });

        dayOffset += 7;
        if (dayOffset > 25) {
            dayOffset = (dayOffset % 25) + 1;
            currentMonthIndex++;
        }
    }

    // 2. Generate Students
    for (let i = 1; i <= 80; i++) {
        const cycle = cycles[Math.floor(Math.random() * 20)]; // Assign to earlier cycles
        cycle.enrolledCount++;

        const isConflict = Math.random() > 0.9;
        const isGraduated = !isConflict && cycle.status === 'COMPLETED';

        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

        students.push({
            id: uuidv4(),
            name: `${firstName} ${lastName}`,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
            phone: `+54 9 11 ${Math.floor(Math.random() * 90000000) + 10000000}`,
            pl: Math.floor(Math.random() * 50) + 1,
            cycleId: cycle.id,
            currentPackage: cycle.level,
            purchasedPackage: Math.random() > 0.7 ? 'COMBO INICIAL+AVANZADO' : cycle.level,
            status: isConflict ? 'CONFLICT' : isGraduated ? 'GRADUATED' : 'ACTIVE',
            progress: isGraduated ? 100 : isConflict ? 40 : Math.floor(Math.random() * 80),
            attendance: isGraduated
                ? [true, true, true, true]
                : isConflict
                    ? [true, false, false, false]
                    : [true, true, false, false],
            nextPackageLocked: !isGraduated,
            notes: ''
        });
    }

    // 3. Generate Registrations
    for (let i = 1; i <= 15; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

        registrations.push({
            id: uuidv4(),
            name: `${firstName} ${lastName}`,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
            date: `2024-11-${Math.floor(Math.random() * 20) + 1}`,
            status: i > 10 ? 'PENDING_PAYMENT' : 'PENDING_REVIEW',
            selectedPackage: Math.random() > 0.5 ? 'INICIAL' : 'COMBO INICIAL+AVANZADO',
            answers: [
                { question: '¿Por qué quieres unirte?', answer: 'Busco herramientas para gestionar mis emociones y crecer profesionalmente.' },
                { question: 'Compromiso', answer: 'Estoy dispuesto a comprometerme al 100% con el proceso.' }
            ]
        });
    }

    return { cycles, students, registrations };
};

// Service Implementation
export const MockDataService = {
    // --- Cycles ---
    getCycles: (): CycleEvent[] => {
        const stored = localStorage.getItem('home_admin_cycles');
        if (!stored) {
            const { cycles } = generateInitialData();
            localStorage.setItem('home_admin_cycles', JSON.stringify(cycles));
            return cycles;
        }
        return JSON.parse(stored);
    },

    saveCycles: (cycles: CycleEvent[]) => {
        localStorage.setItem('home_admin_cycles', JSON.stringify(cycles));
    },

    addCycle: (cycle: CycleEvent) => {
        const cycles = MockDataService.getCycles();
        cycles.push(cycle);
        MockDataService.saveCycles(cycles);
    },

    // --- Students ---
    getStudents: (): Student[] => {
        const stored = localStorage.getItem('home_admin_students');
        if (!stored) {
            const { students } = generateInitialData();
            localStorage.setItem('home_admin_students', JSON.stringify(students));
            return students;
        }
        return JSON.parse(stored);
    },

    saveStudents: (students: Student[]) => {
        localStorage.setItem('home_admin_students', JSON.stringify(students));
    },

    updateStudent: (updatedStudent: Student) => {
        const students = MockDataService.getStudents();
        const index = students.findIndex(s => s.id === updatedStudent.id);
        if (index !== -1) {
            students[index] = updatedStudent;
            MockDataService.saveStudents(students);
        }
    },

    // --- Registrations ---
    getRegistrations: (): Registration[] => {
        const stored = localStorage.getItem('home_admin_registrations');
        if (!stored) {
            const { registrations } = generateInitialData();
            localStorage.setItem('home_admin_registrations', JSON.stringify(registrations));
            return registrations;
        }
        return JSON.parse(stored);
    },

    saveRegistrations: (registrations: Registration[]) => {
        localStorage.setItem('home_admin_registrations', JSON.stringify(registrations));
    },

    // Reset Data (for debugging)
    resetData: () => {
        localStorage.removeItem('home_admin_cycles');
        localStorage.removeItem('home_admin_students');
        localStorage.removeItem('home_admin_registrations');
        window.location.reload();
    }
};
