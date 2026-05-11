export interface FrappeDepartment {
  id?: string
  name: string
  department_name?: string
}

export interface CreateDepartmentInput {
  name: string
  company: string
  owner: string
}

export function toFrappeDepartmentDoc(input: CreateDepartmentInput): Record<string, unknown> {
  return {
    doctype: 'Department',
    department_name: input.name,
    company: input.company,
    owner: input.owner,
    disabled: 0,
  }
}
