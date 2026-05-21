import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Commission from '#models/commission'

export default class extends BaseSeeder {
  async run() {
    // Taux par défaut pour les tickets (12%)
    await Commission.firstOrCreate(
      { targetType: 'ticket', isDefault: true },
      { label: 'Ticket standard', targetType: 'ticket', targetValue: null, rate: 12, isDefault: true, isActive: true }
    )

    // Taux par défaut pour les prestataires (15%)
    await Commission.firstOrCreate(
      { targetType: 'provider', isDefault: true },
      { label: 'Service prestataire standard', targetType: 'provider', targetValue: null, rate: 15, isDefault: true, isActive: true }
    )

    // Commissions spécifiques par type de prestataire
    const providerRates = [
      { label: 'DJ', targetValue: 'dj', rate: 5 },
      { label: 'Divertissement & Animation', targetValue: 'divertissement_animation', rate: 10 },
      { label: 'Technique & Logistique', targetValue: 'technique_logistique', rate: 8 },
      { label: 'Gastronomie', targetValue: 'gastronomie', rate: 12 },
      { label: 'Image & Souvenirs', targetValue: 'image_souvenirs', rate: 10 },
      { label: 'Décoration & Design', targetValue: 'decoration_design', rate: 10 },
      { label: 'Services & Confort', targetValue: 'services_confort', rate: 8 },
      { label: 'Conseil & Organisation', targetValue: 'conseil_organisation', rate: 12 },
    ]

    for (const item of providerRates) {
      await Commission.firstOrCreate(
        { targetType: 'provider', targetValue: item.targetValue },
        { label: item.label, targetType: 'provider', targetValue: item.targetValue, rate: item.rate, isDefault: false, isActive: true }
      )
    }

    console.log('✅ Commissions seedées avec succès')
  }
}
