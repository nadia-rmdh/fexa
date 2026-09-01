import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

interface FieldWrapperProps {
  label: string
  children: ReactNode
}

function FieldWrapper({ label, children }: FieldWrapperProps) {
  return (
    <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-zinc-300 px-3 py-2 text-base text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function TextField({ label, className = '', ...props }: TextFieldProps) {
  return (
    <FieldWrapper label={label}>
      <input className={`${inputClass} ${className}`} {...props} />
    </FieldWrapper>
  )
}

interface NumberFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label: string
  value: number | ''
  onChange: (value: number) => void
}

export function NumberField({ label, value, onChange, className = '', ...props }: NumberFieldProps) {
  return (
    <FieldWrapper label={label}>
      <input
        type="number"
        inputMode="numeric"
        className={`${inputClass} ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        {...props}
      />
    </FieldWrapper>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
}

export function SelectField({ label, className = '', children, ...props }: SelectFieldProps) {
  return (
    <FieldWrapper label={label}>
      <select className={`${inputClass} ${className}`} {...props}>
        {children}
      </select>
    </FieldWrapper>
  )
}

interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function CheckboxField({ label, className = '', ...props }: CheckboxFieldProps) {
  return (
    <label className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      <input type="checkbox" className={`h-4 w-4 ${className}`} {...props} />
      {label}
    </label>
  )
}
