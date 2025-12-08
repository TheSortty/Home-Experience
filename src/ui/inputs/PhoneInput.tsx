import React, { useState, useEffect } from 'react';

export interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    required?: boolean;
}

const COUNTRY_CODES = [
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+1', country: 'Estados Unidos', flag: '🇺🇸' },
    { code: '+55', country: 'Brasil', flag: '🇧🇷' },
    { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+51', country: 'Perú', flag: '🇵🇪' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+52', country: 'México', flag: '🇲🇽' },
    { code: '+34', country: 'España', flag: '🇪🇸' },
    { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
    { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
    { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
    { code: '+507', country: 'Panamá', flag: '🇵🇦' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
    // Add more as needed
];

const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, className = '', required = false }) => {
    const [selectedCode, setSelectedCode] = useState('+54');
    const [phoneNumber, setPhoneNumber] = useState('');

    // Parse initial value if present
    useEffect(() => {
        if (value) {
            // Try to match a known code
            const found = COUNTRY_CODES.find(c => value.startsWith(c.code));
            if (found) {
                setSelectedCode(found.code);
                setPhoneNumber(value.replace(found.code, '').trim());
            } else {
                // If no match found but value exists, assume it's just a number or custom format
                setPhoneNumber(value);
            }
        }
    }, []);

    const handleCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCode = e.target.value;
        setSelectedCode(newCode);
        onChange(`${newCode} ${phoneNumber}`);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newNumber = e.target.value.replace(/[^0-9]/g, ''); // Enforce numbers only for the input part
        setPhoneNumber(newNumber);
        onChange(`${selectedCode} ${newNumber}`);
    };

    return (
        <div className={`flex gap-2 ${className}`}>
            <div className="relative">
                <select
                    value={selectedCode}
                    onChange={handleCodeChange}
                    className="h-full pl-3 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer min-w-[100px]"
                >
                    {COUNTRY_CODES.map((c) => (
                        <option key={c.country} value={c.code}>
                            {c.flag} {c.code}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>

            <input
                type="tel"
                value={phoneNumber}
                onChange={handleNumberChange}
                placeholder="11 1234 5678"
                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required={required}
            />
        </div>
    );
};

export default PhoneInput;
