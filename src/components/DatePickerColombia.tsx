// components/DatePickerColombia.tsx
"use client";

import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import Holidays from "date-holidays";

interface Props {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export default function DatePickerColombia({ value, onChange, error }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const hd = new Holidays("CO");

    const festivos = hd
      .getHolidays(new Date().getFullYear())
      .map((h) => h.date.split(" ")[0]);

    if (inputRef.current) {
      flatpickr(inputRef.current, {
        dateFormat: "Y-m-d",
        defaultDate: value,
        disable: festivos,
        onChange: (selectedDates) => {
          if (selectedDates.length > 0) {
            const iso = selectedDates[0].toISOString().split("T")[0];
            onChange(iso);
          }
        },

        onDayCreate: (dObj, dStr, fp, dayElem) => {
          const iso = dayElem.dateObj.toISOString().split("T")[0];
          if (festivos.includes(iso)) {
            dayElem.classList.add("festivo-colombia");
          }
        },
      });
    }
  }, [onChange, value]);

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#99d6e8] ${
          error ? "border-red-500" : "border-gray-300"
        }`}
        placeholder="Selecciona una fecha"
      />

      <style>{`
        .flatpickr-day.festivo-colombia {
          background: #ffdddd !important;
          color: #d30000 !important;
          border: 1px solid #ff8a8a !important;
          opacity: 0.7;
          pointer-events: none !important;
        }
      `}</style>
    </>
  );
}
