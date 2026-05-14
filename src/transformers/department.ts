export interface FrappeDepartment {
  id?: string
  name: string
  department_name?: string
  parent_department?: string
  is_group?: number
  disabled?: number
}

export interface Department {
  id: string
  name: string
  parentDepartment: string
  isGroup: boolean
  disabled: boolean
}

export interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[]
}

export function decodeDepartment(f: FrappeDepartment): Department {
  const id = f.id ?? f.name
  return {
    id,
    name: f.department_name ?? id,
    parentDepartment: f.parent_department ?? '',
    isGroup: f.is_group === 1,
    disabled: f.disabled === 1,
  }
}

export function buildDepartmentTree(departments: Department[]): DepartmentTreeNode[] {
  const map = new Map<string, DepartmentTreeNode>()
  for (const d of departments) {
    map.set(d.id, { ...d, children: [] })
  }
  const roots: DepartmentTreeNode[] = []
  for (const node of map.values()) {
    const parentId = node.parentDepartment
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export interface CreateDepartmentInput {
  name: string
  company: string
  owner: string
  parentDepartment?: string
}

export function toFrappeDepartmentDoc(input: CreateDepartmentInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    doctype: 'Department',
    department_name: input.name,
    company: input.company,
    owner: input.owner,
    disabled: 0,
  }
  if (input.parentDepartment) {
    doc.parent_department = input.parentDepartment
  }
  return doc
}
