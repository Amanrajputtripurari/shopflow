import type { AuthUser } from '@shared/types/auth'
import type { Customer, CustomerInput, CustomerListFilters, CustomerSearchQuery, CustomerSearchResult } from '@shared/types/customer'
import type { PaginatedResult } from '@shared/types/pagination'
import { customersRepository } from '../repositories/customers.repository'

export class CustomersService {
  async list(filters: CustomerListFilters = {}): Promise<PaginatedResult<Customer>> {
    return customersRepository.list(filters)
  }

  async search(query?: CustomerSearchQuery): Promise<CustomerSearchResult> {
    return customersRepository.searchPaginated(query)
  }

  async get(id: string): Promise<Customer> {
    const customer = await customersRepository.getById(id)
    if (!customer) {
      throw new Error('Customer not found.')
    }
    return customer
  }

  async create(_user: AuthUser, input: CustomerInput): Promise<Customer> {
    this.validateInput(input)
    return customersRepository.create(input)
  }

  async update(_user: AuthUser, id: string, input: CustomerInput): Promise<Customer> {
    this.validateInput(input)
    const customer = await customersRepository.update(id, input)
    if (!customer) {
      throw new Error('Customer not found.')
    }
    return customer
  }

  async delete(user: AuthUser, id: string): Promise<void> {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can delete customers.')
    }

    const deleted = await customersRepository.delete(id)
    if (!deleted) {
      throw new Error('Customer not found.')
    }
  }

  private validateInput(input: CustomerInput): void {
    if (!input.name.trim()) {
      throw new Error('Customer name is required.')
    }
  }
}

export const customersService = new CustomersService()
