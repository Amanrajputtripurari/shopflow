import type { CompanyInput, CompanyProfile } from '@shared/types/company'
import { companyRepository } from '../repositories/company.repository'

export class CompanyService {
  async getProfile(): Promise<CompanyProfile> {
    return companyRepository.getProfile()
  }

  async saveProfile(input: CompanyInput): Promise<CompanyProfile> {
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error('Company name is required.')
    }

    return companyRepository.saveProfile(input)
  }
}

export const companyService = new CompanyService()
