import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'
import EventType from '#models/event_type'
import ProviderType from '#models/provider_type'

const EVENT_TYPES: { slug: string; label: string; sort: number }[] = [
  { slug: 'mariage', label: 'Mariage', sort: 1 },
  { slug: 'anniversaire', label: 'Anniversaire', sort: 2 },
  { slug: 'bapteme', label: 'Baptême', sort: 3 },
  { slug: 'ceremonie_religieuse', label: 'Cérémonie religieuse', sort: 4 },
  { slug: 'soiree_privee', label: 'Soirée privée', sort: 5 },
  { slug: 'conference', label: 'Conférence', sort: 10 },
  { slug: 'seminaire', label: 'Séminaire', sort: 11 },
  { slug: 'atelier', label: 'Atelier (Workshop)', sort: 12 },
  { slug: 'formation', label: 'Formation', sort: 13 },
  { slug: 'masterclass', label: 'Masterclass', sort: 14 },
  { slug: 'forum', label: 'Forum', sort: 15 },
  { slug: 'salon_professionnel', label: 'Salon professionnel', sort: 16 },
  { slug: 'exposition', label: 'Exposition commerciale', sort: 17 },
  { slug: 'lancement_produit', label: 'Lancement de produit', sort: 18 },
  { slug: 'networking', label: 'Networking', sort: 19 },
  { slug: 'team_building', label: 'Team building', sort: 20 },
  { slug: 'assemblee_generale', label: 'Assemblée générale', sort: 21 },
  { slug: 'reunion_strategique', label: 'Réunion stratégique', sort: 22 },
  { slug: 'hackathon', label: 'Hackathon', sort: 23 },
  { slug: 'showcase', label: 'Showcase', sort: 30 },
  { slug: 'concert', label: 'Concert', sort: 31 },
  { slug: 'festival', label: 'Festival', sort: 32 },
  { slug: 'gala', label: 'Gala', sort: 33 },
  { slug: 'soiree_vip', label: 'Soirée VIP', sort: 34 },
  { slug: 'soiree_theme', label: 'Soirée à thème', sort: 35 },
  { slug: 'pool_party', label: 'Pool party', sort: 36 },
  { slug: 'beach_party', label: 'Beach party', sort: 37 },
  { slug: 'karaoke', label: 'Karaoké', sort: 38 },
  { slug: 'comedy_show', label: 'Comedy show', sort: 39 },
  { slug: 'standup', label: 'Stand-up', sort: 40 },
  { slug: 'dj_set', label: 'DJ set', sort: 41 },
  { slug: 'afterwork', label: 'Afterwork', sort: 42 },
  { slug: 'open_mic', label: 'Open mic', sort: 43 },
  { slug: 'lancement_album', label: 'Lancement d\'album', sort: 44 },
  { slug: 'battle', label: 'Battle (danse, rap)', sort: 45 },
  { slug: 'projection_cinema', label: 'Projection cinéma', sort: 46 },
  { slug: 'cinema_plein_air', label: 'Cinéma en plein air', sort: 47 },
  { slug: 'gaming_party', label: 'Gaming party', sort: 48 },
  { slug: 'soiree_etudiante', label: 'Soirée étudiante', sort: 49 },
  { slug: 'autre', label: 'Autre', sort: 99 },
]

const PROVIDER_TYPES: { slug: string; label: string; sort: number }[] = [
  { slug: 'dj', label: 'DJ', sort: 1 },
  { slug: 'photographe', label: 'Photographe', sort: 2 },
  { slug: 'animateur', label: 'Animateur / MC', sort: 3 },
  { slug: 'hotesse', label: 'Hôtesse d\'accueil', sort: 4 },
  { slug: 'securite', label: 'Sécurité événementielle', sort: 5 },
  { slug: 'artiste', label: 'Artiste / Groupe musical', sort: 6 },
  { slug: 'organisateur', label: 'Organisateur d\'événements', sort: 7 },
  { slug: 'location_materiel', label: 'Location de matériel', sort: 8 },
  { slug: 'comedien', label: 'Comédien / Humoriste', sort: 9 },
  { slug: 'traiteur', label: 'Traiteur / Restauration', sort: 10 },
  { slug: 'decorateur', label: 'Décorateur / Fleuriste', sort: 11 },
  { slug: 'videaste', label: 'Vidéaste', sort: 12 },
  { slug: 'shooter', label: 'ESPACE/Salle des fêtes', sort: 13 },
  { slug: 'autre', label: 'Autre prestataire', sort: 99 },
]

export default class extends BaseSeeder {
  async run() {
    for (const t of EVENT_TYPES) {
      const existing = await EventType.query().where('slug', t.slug).first()
      if (existing) {
        existing.label = t.label
        existing.sortOrder = t.sort
        existing.isActive = true
        await existing.save()
      } else {
        await EventType.create({
          slug: t.slug,
          label: t.label,
          isActive: true,
          sortOrder: t.sort,
        })
      }
    }

    for (const t of PROVIDER_TYPES) {
      const existing = await ProviderType.query().where('slug', t.slug).first()
      if (existing) {
        existing.label = t.label
        existing.sortOrder = t.sort
        existing.isActive = true
        await existing.save()
      } else {
        await ProviderType.create({
          slug: t.slug,
          label: t.label,
          isActive: true,
          sortOrder: t.sort,
        })
      }
    }

    // Mettre à jour les événements existants sans type explicite
    await db.from('events').where('title', 'like', '%Festival%').update({ event_type: 'festival' })
    await db.from('events').where('title', 'like', '%Gala%').update({ event_type: 'gala' })
    await db.from('events').where('title', 'like', '%Mariage%').update({ event_type: 'mariage' })
    await db.from('events').where('title', 'like', '%Concert%').update({ event_type: 'concert' })
    await db.from('events').where('title', 'like', '%NOLVA%').update({ event_type: 'networking' })

    // Notes initiales pour prestataires existants (si colonnes vides)
    await db
      .from('service_providers')
      .where('rating_points', 0)
      .where('status', 'active')
      .update({ rating_points: 50, rating_avg: 4.5, rating_count: 5 })

    console.log(`✓ Catalogue : ${EVENT_TYPES.length} types d'événements, ${PROVIDER_TYPES.length} types de prestataires`)
  }
}
