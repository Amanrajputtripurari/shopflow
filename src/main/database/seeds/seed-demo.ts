import { SEED_CUSTOMERS, SEED_PRODUCTS } from '@shared/constants/seed-data'
import { DEFAULT_ADMIN } from '@shared/constants/database'
import { customersRepository } from '../../repositories/customers.repository'
import { ordersRepository } from '../../repositories/orders.repository'
import { productsRepository } from '../../repositories/products.repository'
import { usersRepository } from '../../repositories/users.repository'

export async function seedDemo(): Promise<void> {
  const admin = await usersRepository.findByUsername(DEFAULT_ADMIN.username)
  if (!admin) {
    throw new Error('Admin user missing. Run: npm run seed:users')
  }

  const productIds: string[] = []

  for (const product of SEED_PRODUCTS) {
    const existing = (await productsRepository.listAll()).find((item) => item.sku === product.sku.toUpperCase())
    if (existing) {
      productIds.push(existing.id)
      continue
    }

    const created = await productsRepository.create(product)
    productIds.push(created.id)
  }

  console.log(`✓ Products ready (${productIds.length})`)

  const customerIds: string[] = []

  for (const customer of SEED_CUSTOMERS) {
    const existing = (await customersRepository.listAll()).find(
      (item) => item.phone === customer.phone && item.name === customer.name
    )
    if (existing) {
      customerIds.push(existing.id)
      continue
    }

    const created = await customersRepository.create({
      ...customer,
      tags: [...customer.tags]
    })
    customerIds.push(created.id)
  }

  console.log(`✓ Customers ready (${customerIds.length})`)

  const existingOrders = await ordersRepository.list({ limit: 1 })
  if (existingOrders.items.length > 0) {
    console.log('✓ Orders already exist — skipping sample orders')
    return
  }

  const rice = (await productsRepository.listAll()).find((p) => p.sku === 'RICE-5KG')
  const oil = (await productsRepository.listAll()).find((p) => p.sku === 'OIL-1L')
  const rahul = (await customersRepository.listAll()).find((c) => c.name === 'Rahul Sharma')

  if (rice && oil) {
    const retail = await ordersRepository.create(
      {
        type: 'retail',
        customerId: rahul?.id ?? null,
        customerName: rahul?.name ?? 'Walk-in Customer',
        lines: [
          {
            productId: rice.id,
            nameSnapshot: rice.name,
            skuSnapshot: rice.sku,
            unitSnapshot: rice.unit,
            qty: 2,
            rate: rice.price,
            taxPercent: rice.taxPercent
          },
          {
            productId: oil.id,
            nameSnapshot: oil.name,
            skuSnapshot: oil.sku,
            unitSnapshot: oil.unit,
            qty: 1,
            rate: oil.price,
            taxPercent: oil.taxPercent
          }
        ],
        notes: 'Sample retail order (seed)'
      },
      admin._id.toString(),
      admin.displayName
    )

    await ordersRepository.updateStatus(retail.id, 'confirmed')
    console.log(`✓ Sample retail order: ${retail.orderNo}`)
  }

  const priya = (await customersRepository.listAll()).find((c) => c.name === 'Priya Traders')
  const tea = (await productsRepository.listAll()).find((p) => p.sku === 'TEA-500G')

  if (priya && tea) {
    const delivery = await ordersRepository.create(
      {
        type: 'delivery',
        customerId: priya.id,
        customerName: priya.name,
        lines: [
          {
            productId: tea.id,
            nameSnapshot: tea.name,
            skuSnapshot: tea.sku,
            unitSnapshot: tea.unit,
            qty: 5,
            rate: tea.price,
            taxPercent: tea.taxPercent
          }
        ],
        delivery: {
          address: priya.address,
          charge: 50,
          notes: 'Deliver before 6 PM'
        },
        notes: 'Sample delivery order (seed)'
      },
      admin._id.toString(),
      admin.displayName
    )

    await ordersRepository.updateStatus(delivery.id, 'confirmed')
    console.log(`✓ Sample delivery order: ${delivery.orderNo}`)
  }

  console.log('✓ Demo seed complete')
}
