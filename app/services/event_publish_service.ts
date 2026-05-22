/** Conseils et prestataires recommandés selon le type d'événement (assistant NOLVA) */

const PROVIDER_BY_EVENT: Record<string, string[]> = {
  mariage: ['traiteur', 'photographe', 'dj', 'decorateur', 'animateur', 'videaste', 'securite'],
  anniversaire: ['traiteur', 'dj', 'animateur', 'photographe', 'decorateur'],
  bapteme: ['traiteur', 'photographe', 'decorateur', 'animateur'],
  ceremonie_religieuse: ['traiteur', 'photographe', 'decorateur', 'animateur'],
  soiree_privee: ['dj', 'traiteur', 'animateur', 'photographe'],
  conference: ['organisateur', 'location_materiel', 'photographe', 'videaste', 'hotesse'],
  seminaire: ['organisateur', 'location_materiel', 'photographe', 'hotesse'],
  atelier: ['organisateur', 'location_materiel', 'photographe'],
  formation: ['organisateur', 'location_materiel', 'photographe'],
  masterclass: ['organisateur', 'photographe', 'videaste'],
  forum: ['organisateur', 'hotesse', 'securite', 'photographe'],
  salon_professionnel: ['organisateur', 'decorateur', 'hotesse', 'securite', 'photographe'],
  exposition: ['organisateur', 'decorateur', 'hotesse', 'photographe'],
  lancement_produit: ['organisateur', 'photographe', 'videaste', 'decorateur', 'hotesse'],
  networking: ['organisateur', 'dj', 'traiteur', 'hotesse', 'photographe'],
  team_building: ['animateur', 'organisateur', 'traiteur', 'photographe'],
  assemblee_generale: ['organisateur', 'location_materiel', 'hotesse'],
  reunion_strategique: ['organisateur', 'location_materiel', 'photographe'],
  hackathon: ['organisateur', 'location_materiel', 'traiteur', 'securite'],
  showcase: ['artiste', 'dj', 'photographe', 'videaste', 'securite'],
  concert: ['artiste', 'dj', 'securite', 'location_materiel', 'photographe', 'videaste'],
  festival: ['artiste', 'dj', 'securite', 'location_materiel', 'traiteur', 'photographe'],
  gala: ['traiteur', 'dj', 'decorateur', 'photographe', 'hotesse', 'securite'],
  soiree_vip: ['dj', 'traiteur', 'hotesse', 'securite', 'photographe'],
  soiree_theme: ['dj', 'decorateur', 'animateur', 'traiteur', 'photographe'],
  pool_party: ['dj', 'animateur', 'securite', 'traiteur'],
  beach_party: ['dj', 'animateur', 'securite', 'traiteur'],
  karaoke: ['dj', 'location_materiel', 'animateur'],
  comedy_show: ['comedien', 'animateur', 'securite', 'photographe'],
  standup: ['comedien', 'animateur', 'photographe'],
  dj_set: ['dj', 'location_materiel', 'securite'],
  afterwork: ['dj', 'traiteur', 'organisateur'],
  open_mic: ['animateur', 'location_materiel', 'photographe'],
  lancement_album: ['artiste', 'dj', 'photographe', 'videaste'],
  battle: ['dj', 'animateur', 'securite', 'photographe'],
  projection_cinema: ['location_materiel', 'organisateur', 'securite'],
  cinema_plein_air: ['location_materiel', 'organisateur', 'securite', 'traiteur'],
  gaming_party: ['animateur', 'location_materiel', 'traiteur'],
  soiree_etudiante: ['dj', 'animateur', 'traiteur', 'securite'],
  autre: ['organisateur', 'dj', 'photographe', 'traiteur'],
}

const TIPS_BY_EVENT: Record<string, string[]> = {
  mariage: [
    'Prévoyez au moins 2 types de billets : invités standard et VIP famille.',
    'Indiquez l’adresse précise et la ville pour faciliter l’accès des prestataires.',
    'Réservez traiteur et DJ au moins 3 semaines avant la date.',
  ],
  concert: [
    'Proposez des tarifs Standard, VIP et Pass coulisses si l’artiste le permet.',
    'Prévoyez un nombre de places cohérent avec la jauge du lieu.',
    'La sécurité événementielle est fortement recommandée pour les concerts.',
  ],
  festival: [
    'Créez plusieurs pass (1 jour, 2 jours, VIP) avec des libellés clairs.',
    'Décrivez les horaires d’ouverture et les règles d’accès dans la description.',
  ],
  conference: [
    'Un billet « Early bird » moins cher peut booster les inscriptions tôt.',
    'Précisez si le déjeuner ou les pauses café sont inclus.',
  ],
  autre: [
    'Choisissez un titre court et explicite pour votre événement.',
    'Ajoutez une image de couverture pour attirer plus de participants.',
    'Définissez au moins un type de billet avec son prix en FCFA.',
  ],
}

const DEFAULT_TIPS = [
  'Renseignez la date, la ville et le lieu pour que les participants vous trouvent facilement.',
  'Vous pouvez créer plusieurs types de billets (ex : Standard, VIP) avec un libellé et un prix chacun.',
  'Le paiement des billets est sécurisé via FedaPay ; NOLVA retient les fonds jusqu’à la fin de l’événement.',
]

export default class EventPublishService {
  static providerSlugsForEvent(eventType: string): string[] {
    return PROVIDER_BY_EVENT[eventType] || PROVIDER_BY_EVENT.autre
  }

  static tipsForEvent(eventType: string, context?: { title?: string; city?: string }): string[] {
    const base = TIPS_BY_EVENT[eventType] || TIPS_BY_EVENT.autre || DEFAULT_TIPS
    const extra: string[] = []
    if (context?.title && context.title.length < 8) {
      extra.push('Un titre un peu plus détaillé aide les visiteurs à comprendre votre événement.')
    }
    if (!context?.city) {
      extra.push('Ajoutez une ville (ex : Cotonou) pour apparaître dans les filtres locaux.')
    }
    return [...base, ...DEFAULT_TIPS.slice(0, 1), ...extra].slice(0, 5)
  }

  static suggestedTicketLabels(eventType: string): { label: string; priceHint: number }[] {
    const music = ['concert', 'festival', 'dj_set', 'gala', 'showcase']
    const corporate = ['conference', 'seminaire', 'forum', 'networking']
    if (music.includes(eventType)) {
      return [
        { label: 'Pass Standard', priceHint: 5000 },
        { label: 'VIP', priceHint: 15000 },
      ]
    }
    if (corporate.includes(eventType)) {
      return [
        { label: 'Entrée participant', priceHint: 0 },
        { label: 'Pass Premium', priceHint: 25000 },
      ]
    }
    if (eventType === 'mariage') {
      return [
        { label: 'Invité', priceHint: 0 },
        { label: 'Table VIP', priceHint: 50000 },
      ]
    }
    return [
      { label: 'Standard', priceHint: 3000 },
      { label: 'VIP', priceHint: 10000 },
    ]
  }
}
