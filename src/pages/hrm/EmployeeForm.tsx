import { Combobox } from '../../components/ui/Combobox'
import type { LookupOption } from '../../services/hrm'
import type { Employee, EmployeeStatus } from '../../types/hrm'

export interface FormData {
  name: string
  email: string
  phone: string
  department: string
  position: string
  gender: string
  dateOfBirth: string
  status: EmployeeStatus
  joinDate: string
}

export const EMPTY_FORM: FormData = {
  name: '',
  email: '',
  phone: '',
  department: '',
  position: '',
  gender: '',
  dateOfBirth: '',
  status: 'Onboarding',
  joinDate: new Date().toISOString().slice(0, 10),
}

export function fromEmployee(emp: Employee): FormData {
  return {
    name: emp.name,
    email: emp.email,
    phone: emp.phone,
    department: emp.department,
    position: emp.position,
    gender: emp.gender,
    dateOfBirth: emp.dateOfBirth,
    status: emp.status,
    joinDate: emp.joinDate,
  }
}

export function validate(form: FormData): Partial<FormData> {
  const e: Partial<FormData> = {}
  if (!form.name.trim()) e.name = 'Full name is required.'
  if (!form.email.trim()) e.email = 'Email address is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email.'
  if (!form.department) e.department = 'Please select a department.'
  if (!form.position.trim()) e.position = 'Position is required.'
  if (!form.gender) e.gender = 'Please select a gender.'
  if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth is required.'
  if (!form.joinDate) e.joinDate = 'Join date is required.'
  return e
}

export interface DropdownOptions {
  departments: LookupOption[]
  designations: LookupOption[]
  genders: LookupOption[]
  loadingDepartments: boolean
  loadingDesignations: boolean
  loadingGenders: boolean
  onOpenDepartments?: () => void
  onOpenDesignations?: () => void
  onOpenGenders?: () => void
}

interface FormFieldsProps {
  form: FormData
  errors: Partial<FormData>
  shakingFields: Set<keyof FormData>
  onChange: (field: keyof FormData, value: string) => void
  onShakeEnd: (field: keyof FormData) => void
  options: DropdownOptions
  firstInputRef?: React.Ref<HTMLInputElement>
  emailReadOnly?: boolean
}

export function FormFields({
  form, errors, shakingFields, onChange, onShakeEnd, options, firstInputRef, emailReadOnly = false,
}: FormFieldsProps) {
  const shakeClass = (f: keyof FormData) => (shakingFields.has(f) ? 'field-shake' : '')
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={shakeClass('name')} onAnimationEnd={() => onShakeEnd('name')}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            ref={firstInputRef}
            type="text"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="e.g. Jane Smith"
            className={`form-input ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div className={shakeClass('email')} onAnimationEnd={() => onShakeEnd('email')}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
            readOnly={emailReadOnly}
            placeholder="jane@oceanfleet.com"
            className={`form-input ${errors.email ? 'border-red-400 focus:ring-red-400' : ''} ${emailReadOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''}`}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Phone Number <span className="text-xs text-gray-400">(optional)</span>
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          placeholder="+1 555 000 0000"
          className="form-input"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={shakeClass('department')} onAnimationEnd={() => onShakeEnd('department')}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Department <span className="text-red-500">*</span>
          </label>
          <Combobox
            options={options.departments}
            value={form.department ? [form.department] : []}
            onChange={(vs) => onChange('department', vs[0] ?? '')}
            max={1}
            placeholder="Select department"
            loading={options.loadingDepartments}
            error={!!errors.department}
            onOpen={options.onOpenDepartments}
          />
          {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
        </div>
        <div className={shakeClass('position')} onAnimationEnd={() => onShakeEnd('position')}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Position <span className="text-red-500">*</span>
          </label>
          <Combobox
            options={options.designations}
            value={form.position ? [form.position] : []}
            onChange={(vs) => onChange('position', vs[0] ?? '')}
            max={1}
            placeholder="Select position"
            loading={options.loadingDesignations}
            error={!!errors.position}
            onOpen={options.onOpenDesignations}
          />
          {errors.position && <p className="text-xs text-red-500 mt-1">{errors.position}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={shakeClass('gender')} onAnimationEnd={() => onShakeEnd('gender')}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Gender <span className="text-red-500">*</span>
          </label>
          <Combobox
            options={options.genders}
            value={form.gender ? [form.gender] : []}
            onChange={(vs) => onChange('gender', vs[0] ?? '')}
            max={1}
            placeholder="Select gender"
            loading={options.loadingGenders}
            error={!!errors.gender}
            onOpen={options.onOpenGenders}
          />
          {errors.gender && <p className="text-xs text-red-500 mt-1">{errors.gender}</p>}
        </div>
        <div className={shakeClass('dateOfBirth')} onAnimationEnd={() => onShakeEnd('dateOfBirth')}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => onChange('dateOfBirth', e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className={`form-input ${errors.dateOfBirth ? 'border-red-400 focus:ring-red-400' : ''}`}
          />
          {errors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{errors.dateOfBirth}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
          <Combobox
            options={['Onboarding', 'Active', 'Inactive', 'On Leave']}
            value={[form.status]}
            onChange={(vs) => onChange('status', (vs[0] ?? 'Onboarding'))}
            max={1}
            clearable={false}
            placeholder="Select status"
          />
        </div>
        <div className={shakeClass('joinDate')} onAnimationEnd={() => onShakeEnd('joinDate')}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Join Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.joinDate}
            onChange={(e) => onChange('joinDate', e.target.value)}
            className={`form-input ${errors.joinDate ? 'border-red-400 focus:ring-red-400' : ''}`}
          />
          {errors.joinDate && <p className="text-xs text-red-500 mt-1">{errors.joinDate}</p>}
        </div>
      </div>
    </div>
  )
}
