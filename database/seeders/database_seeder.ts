import { BaseSeeder } from '@adonisjs/lucid/seeders'
import CatalogSeeder from './catalog_seeder.js'
import User from '#models/user'
import ServiceProvider from '#models/service_provider'
import Offer from '#models/offer'
import Availability from '#models/availability'
import Event from '#models/event'
import QuoteRequest from '#models/quote_request'
import Reservation from '#models/reservation'
import Ticket from '#models/ticket'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    await new CatalogSeeder().run()

    // ============================================
    // 1. UTILISATEURS
    // ============================================

    // Admin
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'NOLVA',
      email: 'admin@nolva.bj',
      phone: '+22960000000',
      password: 'password123',
      role: 'admin',
      city: 'Cotonou',
      isActive: true,
    })

    // Utilisateur simple 1 - pour se connecter
    const user1 = await User.create({
      firstName: 'Koffi',
      lastName: 'Ahounou',
      email: 'koffi@test.com',
      phone: '+22961000001',
      password: 'password123',
      role: 'user',
      city: 'Cotonou',
      interests: JSON.stringify(['Mariage', 'Concert', 'Conference']) as any,
      isActive: true,
    })

    // Utilisateur simple 2
    const user2 = await User.create({
      firstName: 'Amina',
      lastName: 'Saka',
      email: 'amina@test.com',
      phone: '+22962000002',
      password: 'password123',
      role: 'user',
      city: 'Porto-Novo',
      interests: JSON.stringify(['Anniversaire', 'Mariage']) as any,
      isActive: true,
    })

    // Utilisateur simple 3
    const user3 = await User.create({
      firstName: 'Boris',
      lastName: 'Hounkpatin',
      email: 'boris@test.com',
      phone: '+22963000003',
      password: 'password123',
      role: 'user',
      city: 'Calavi',
      interests: JSON.stringify(['Concert', 'Festival']) as any,
      isActive: true,
    })

    // --- Prestataires (users with role=provider) ---

    // DJ
    const provUser1 = await User.create({
      firstName: 'Emmanuel',
      lastName: 'Dossou',
      email: 'dj.flash@test.com',
      phone: '+22964000004',
      password: 'password123',
      role: 'provider',
      city: 'Cotonou',
      isActive: true,
    })

    // Photographe
    const provUser2 = await User.create({
      firstName: 'Grace',
      lastName: 'Agbodjan',
      email: 'grace.photo@test.com',
      phone: '+22965000005',
      password: 'password123',
      role: 'provider',
      city: 'Cotonou',
      isActive: true,
    })

    // Animateur
    const provUser3 = await User.create({
      firstName: 'Patrick',
      lastName: 'Akoto',
      email: 'patrick.anim@test.com',
      phone: '+22966000006',
      password: 'password123',
      role: 'provider',
      city: 'Calavi',
      isActive: true,
    })

    // Hotesse
    const provUser4 = await User.create({
      firstName: 'Estelle',
      lastName: 'Quenum',
      email: 'estelle.event@test.com',
      phone: '+22967000007',
      password: 'password123',
      role: 'provider',
      city: 'Porto-Novo',
      isActive: true,
    })

    // Securite
    const provUser5 = await User.create({
      firstName: 'Rodrigue',
      lastName: 'Gbaguidi',
      email: 'rodrigue.secu@test.com',
      phone: '+22968000008',
      password: 'password123',
      role: 'provider',
      city: 'Cotonou',
      isActive: true,
    })

    // Artiste
    const provUser6 = await User.create({
      firstName: 'Carine',
      lastName: 'Tossou',
      email: 'carine.art@test.com',
      phone: '+22969000009',
      password: 'password123',
      role: 'provider',
      city: 'Parakou',
      isActive: true,
    })

    // Organisateur
    const provUser7 = await User.create({
      firstName: 'Fabrice',
      lastName: 'Adjakou',
      email: 'fabrice.orga@test.com',
      phone: '+22970000010',
      password: 'password123',
      role: 'provider',
      city: 'Cotonou',
      isActive: true,
    })

    // Location materiel
    const provUser8 = await User.create({
      firstName: 'Herve',
      lastName: 'Zinsou',
      email: 'herve.loc@test.com',
      phone: '+22971000011',
      password: 'password123',
      role: 'provider',
      city: 'Abomey',
      isActive: true,
    })

    // ============================================
    // 2. PRESTATAIRES (ServiceProvider)
    // ============================================

    const provider1 = await ServiceProvider.create({
      userId: provUser1.id,
      businessName: 'DJ Flash Cotonou',
      type: 'dj',
      statusCompte: 'individuel',
      description: 'DJ professionnel depuis 8 ans, specialise dans les mariages et soirees privees a Cotonou. Son et lumieres haut de gamme, repertoire africain et international.',
      specialty: 'Afrobeat / Amapiano',
      experienceYears: '8',
      eventTypes: JSON.stringify(['Mariage', 'Anniversaire', 'Soiree privee', 'Concert']) as any,
      addedValue: JSON.stringify(['Systeme son professionnel', 'Jeux de lumieres', 'Micro sans fil']) as any,
      city: 'Cotonou',
      zones: JSON.stringify(['Cotonou', 'Calavi', 'Ouidah', 'Porto-Novo']) as any,
      travelPossible: true,
      travelFees: true,
      instagram: 'djflash_cotonou',
      facebook: 'djflashcotonou',
      tiktok: 'djflash229',
      status: 'active',
      isVerified: true,
      isAvailable: true,
      ratingAvg: 4.8,
      ratingCount: 24,
      ratingPoints: 185,
    })

    const provider2 = await ServiceProvider.create({
      userId: provUser2.id,
      businessName: 'Grace Photo Studio',
      type: 'photographe',
      statusCompte: 'entreprise',
      description: 'Studio photo professionnel specialise dans la couverture de mariages, portraits et evenements corporatifs. Reportage photo et video, tirage et album.',
      specialty: 'Mariage et Portraits',
      experienceYears: '5',
      eventTypes: JSON.stringify(['Mariage', 'Bapteme', 'Conference', 'Anniversaire']) as any,
      addedValue: JSON.stringify(['Album photo inclus', 'Drone disponible', 'Retouche pro']) as any,
      city: 'Cotonou',
      zones: JSON.stringify(['Cotonou', 'Calavi', 'Porto-Novo']) as any,
      travelPossible: true,
      travelFees: false,
      instagram: 'gracephotostudio',
      facebook: 'GracePhotoBenin',
      status: 'active',
      isVerified: true,
      isAvailable: true,
      ratingAvg: 4.9,
      ratingCount: 31,
      ratingPoints: 220,
    })

    const provider3 = await ServiceProvider.create({
      userId: provUser3.id,
      businessName: 'Patrick Le Showman',
      type: 'animateur',
      statusCompte: 'individuel',
      description: 'Animateur et MC bilingue (francais/fon), specialise dans les ceremonies de mariage, anniversaires et conferences. Ambiance garantie !',
      specialty: 'Ceremonies et Mariages',
      experienceYears: '10',
      eventTypes: JSON.stringify(['Mariage', 'Anniversaire', 'Conference', 'Seminaire']) as any,
      addedValue: JSON.stringify(['Bilingue francais/fon', 'Sonorisation portable', 'Jeux et animations']) as any,
      city: 'Calavi',
      zones: JSON.stringify(['Calavi', 'Cotonou', 'Abomey', 'Bohicon']) as any,
      travelPossible: true,
      travelFees: true,
      facebook: 'patrickshowman',
      status: 'active',
      isVerified: true,
      isAvailable: true,
      ratingAvg: 4.7,
      ratingCount: 18,
      ratingPoints: 150,
    })

    const provider4 = await ServiceProvider.create({
      userId: provUser4.id,
      businessName: 'Estelle Events Hotesses',
      type: 'hotesse',
      statusCompte: 'entreprise',
      description: 'Agence de placement de hotesses d\'accueil pour vos evenements : conferences, salons, galas, mariages. Equipes professionnelles et tenues adaptees.',
      specialty: 'Accueil et protocole',
      experienceYears: '4',
      eventTypes: JSON.stringify(['Conference', 'Seminaire', 'Gala', 'Mariage']) as any,
      addedValue: JSON.stringify(['Tenues fournies', 'Formation protocole', 'Bilingue']) as any,
      city: 'Porto-Novo',
      zones: JSON.stringify(['Porto-Novo', 'Cotonou', 'Calavi']) as any,
      travelPossible: true,
      travelFees: false,
      instagram: 'estelle_events',
      status: 'active',
      isVerified: false,
      isAvailable: true,
      ratingAvg: 4.5,
      ratingCount: 12,
      ratingPoints: 95,
    })

    const provider5 = await ServiceProvider.create({
      userId: provUser5.id,
      businessName: 'Securite Pro Benin',
      type: 'securite',
      statusCompte: 'entreprise',
      description: 'Service de securite evenementielle au Benin. Agents formes, vigiles en tenue, controle des acces pour concerts, festivals, mariages et evenements d\'entreprise.',
      specialty: 'Securite evenementielle',
      experienceYears: '6',
      eventTypes: JSON.stringify(['Concert', 'Festival', 'Mariage', 'Conference']) as any,
      addedValue: JSON.stringify(['Agents certifies', 'Materiel de detection', 'Rapports post-event']) as any,
      city: 'Cotonou',
      zones: JSON.stringify(['Cotonou', 'Calavi', 'Porto-Novo', 'Ouidah', 'Parakou']) as any,
      travelPossible: true,
      travelFees: true,
      status: 'active',
      isVerified: true,
      isAvailable: true,
      ratingAvg: 4.6,
      ratingCount: 15,
      ratingPoints: 120,
    })

    const provider6 = await ServiceProvider.create({
      userId: provUser6.id,
      businessName: 'Carine & The Band',
      type: 'artiste',
      statusCompte: 'individuel',
      description: 'Chanteuse et musicienne avec son groupe live. Repertoire varié : afrobeat, gospel, varietes francaises, R&B. Prestation live pour mariages, galas et concerts prives.',
      specialty: 'Musique live Afrobeat/Gospel',
      experienceYears: '7',
      eventTypes: JSON.stringify(['Mariage', 'Gala', 'Concert', 'Soiree privee']) as any,
      addedValue: JSON.stringify(['Groupe live 5 musiciens', 'Repertoire personnalise', 'Sonorisation incluse']) as any,
      city: 'Parakou',
      zones: JSON.stringify(['Parakou', 'Natitingou', 'Cotonou']) as any,
      travelPossible: true,
      travelFees: true,
      instagram: 'carine_theband',
      tiktok: 'carine_music',
      status: 'active',
      isVerified: true,
      isAvailable: false,
      ratingAvg: 4.8,
      ratingCount: 20,
      ratingPoints: 165,
    })

    const provider7 = await ServiceProvider.create({
      userId: provUser7.id,
      businessName: 'Fabrice Events Agency',
      type: 'organisateur',
      statusCompte: 'entreprise',
      description: 'Agence d\'organisation evenementielle complete a Cotonou. Mariages, seminaires, conferences, lancements de produits. De la conception a la realisation.',
      specialty: 'Organisation complete',
      experienceYears: '12',
      eventTypes: JSON.stringify(['Mariage', 'Seminaire', 'Conference', 'Lancement produit', 'Festival']) as any,
      addedValue: JSON.stringify(['Coordination complete', 'Decoration incluse', 'Gestion des prestataires']) as any,
      city: 'Cotonou',
      zones: JSON.stringify(['Cotonou', 'Calavi', 'Porto-Novo', 'Ouidah', 'Parakou', 'Abomey']) as any,
      travelPossible: true,
      travelFees: false,
      instagram: 'fabrice_events',
      facebook: 'FabriceEventsAgency',
      status: 'active',
      isVerified: true,
      isAvailable: true,
      ratingAvg: 4.9,
      ratingCount: 28,
      ratingPoints: 210,
    })

    const provider8 = await ServiceProvider.create({
      userId: provUser8.id,
      businessName: 'BenEvent Location',
      type: 'location_materiel',
      statusCompte: 'entreprise',
      description: 'Location de materiel evenementiel : tentes, chaises, tables, nappes, vaisselle, sonorisation, eclairage, groupes electrogenes. Livraison et installation incluses.',
      specialty: 'Tentes et mobilier',
      experienceYears: '9',
      eventTypes: JSON.stringify(['Mariage', 'Anniversaire', 'Conference', 'Festival', 'Ceremonie religieuse']) as any,
      addedValue: JSON.stringify(['Livraison gratuite Cotonou', 'Installation incluse', 'Napperon et decoration']) as any,
      city: 'Abomey',
      zones: JSON.stringify(['Abomey', 'Bohicon', 'Cotonou', 'Calavi']) as any,
      travelPossible: true,
      travelFees: true,
      facebook: 'beneventlocation',
      status: 'active',
      isVerified: false,
      isAvailable: true,
      ratingAvg: 4.4,
      ratingCount: 9,
      ratingPoints: 72,
    })

    // ============================================
    // 3. OFFRES
    // ============================================

    // DJ Flash - 3 offres
    await Offer.create({
      providerId: provider1.id,
      name: 'Pack Essentiel',
      included: JSON.stringify(['DJ 4h', 'Sonorisation standard', 'Playlist personnalisee']) as any,
      duration: '4 heures',
      priceMin: 80000,
      priceMax: 120000,
      currency: 'FCFA',
      isActive: true,
    })
    await Offer.create({
      providerId: provider1.id,
      name: 'Pack Mariage',
      included: JSON.stringify(['DJ 8h', 'Sonorisation premium', 'Jeux de lumieres', '2 micros sans fil', 'Playlist sur mesure']) as any,
      duration: '8 heures',
      priceMin: 200000,
      priceMax: 350000,
      currency: 'FCFA',
      isActive: true,
    })
    await Offer.create({
      providerId: provider1.id,
      name: 'Pack Festival',
      included: JSON.stringify(['DJ toute la soiree', 'Systeme son 2000W', 'Lumieres LED', 'Machine a fumee', 'Micro']) as any,
      duration: '10 heures',
      priceMin: 400000,
      priceMax: 600000,
      currency: 'FCFA',
      isActive: true,
    })

    // Grace Photo - 2 offres
    await Offer.create({
      providerId: provider2.id,
      name: 'Reportage Photo',
      included: JSON.stringify(['1 photographe', '200 photos retouchees', 'Galerie en ligne', 'Cle USB']) as any,
      duration: '6 heures',
      priceMin: 150000,
      priceMax: 250000,
      currency: 'FCFA',
      isActive: true,
    })
    await Offer.create({
      providerId: provider2.id,
      name: 'Pack Mariage Photo + Video',
      included: JSON.stringify(['2 photographes', '1 videaste', 'Album 30 pages', 'Film resume 5min', '500 photos', 'Drone']) as any,
      duration: 'Journee complete',
      priceMin: 350000,
      priceMax: 500000,
      currency: 'FCFA',
      isActive: true,
    })

    // Patrick Animateur - 2 offres
    await Offer.create({
      providerId: provider3.id,
      name: 'Animation Standard',
      included: JSON.stringify(['MC / Animateur', 'Sonorisation', 'Jeux et divertissement']) as any,
      duration: '5 heures',
      priceMin: 100000,
      priceMax: 150000,
      currency: 'FCFA',
      isActive: true,
    })
    await Offer.create({
      providerId: provider3.id,
      name: 'Animation Mariage Complet',
      included: JSON.stringify(['MC bilingue', 'Animation complete mariage', 'Sonorisation', 'Coordination deroulement']) as any,
      duration: 'Journee',
      priceMin: 200000,
      priceMax: 300000,
      currency: 'FCFA',
      isActive: true,
    })

    // Estelle Hotesses - 1 offre
    await Offer.create({
      providerId: provider4.id,
      name: 'Equipe Hotesses (4 personnes)',
      included: JSON.stringify(['4 hotesses', 'Tenues uniformes', 'Accueil et guidage', 'Service VIP']) as any,
      duration: '6 heures',
      priceMin: 120000,
      priceMax: 180000,
      currency: 'FCFA',
      isActive: true,
    })

    // Securite Pro - 2 offres
    await Offer.create({
      providerId: provider5.id,
      name: 'Securite Evenement Standard',
      included: JSON.stringify(['4 agents de securite', 'Controle des acces', 'Ronde de surveillance']) as any,
      duration: '8 heures',
      priceMin: 200000,
      priceMax: 300000,
      currency: 'FCFA',
      isActive: true,
    })
    await Offer.create({
      providerId: provider5.id,
      name: 'Securite Concert / Festival',
      included: JSON.stringify(['8 agents', 'Portiques detection', 'Fouille', 'Zone VIP', 'Rapport de securite']) as any,
      duration: '12 heures',
      priceMin: 400000,
      priceMax: 700000,
      currency: 'FCFA',
      isActive: true,
    })

    // Carine Artiste - 2 offres
    await Offer.create({
      providerId: provider6.id,
      name: 'Prestation Solo',
      included: JSON.stringify(['Carine solo + playback', '1h de prestation', 'Repertoire au choix']) as any,
      duration: '1 heure',
      priceMin: 150000,
      priceMax: 250000,
      currency: 'FCFA',
      isActive: true,
    })
    await Offer.create({
      providerId: provider6.id,
      name: 'Groupe Live Complet',
      included: JSON.stringify(['Carine + 5 musiciens', '2h de prestation live', 'Sonorisation incluse', 'Repertoire personnalise']) as any,
      duration: '2 heures',
      priceMin: 500000,
      priceMax: 800000,
      currency: 'FCFA',
      isActive: true,
    })

    // Fabrice Organisateur - 2 offres
    await Offer.create({
      providerId: provider7.id,
      name: 'Organisation Partielle',
      included: JSON.stringify(['Coordination jour J', 'Gestion prestataires', 'Planning detaille']) as any,
      duration: 'Jour J',
      priceMin: 200000,
      priceMax: 350000,
      currency: 'FCFA',
      isActive: true,
    })
    await Offer.create({
      providerId: provider7.id,
      name: 'Organisation Complete Mariage',
      included: JSON.stringify(['Conception a realisation', 'Selection prestataires', 'Decoration', 'Coordination complete', 'Budget management']) as any,
      duration: '3 mois de preparation',
      priceMin: 500000,
      priceMax: 1500000,
      currency: 'FCFA',
      isActive: true,
    })

    // BenEvent Location - 2 offres
    await Offer.create({
      providerId: provider8.id,
      name: 'Pack 100 places',
      included: JSON.stringify(['1 tente 10x15m', '100 chaises', '12 tables rondes', 'Nappes blanches']) as any,
      duration: '24 heures',
      priceMin: 250000,
      priceMax: 350000,
      currency: 'FCFA',
      isActive: true,
    })
    await Offer.create({
      providerId: provider8.id,
      name: 'Pack 300 places Premium',
      included: JSON.stringify(['2 tentes', '300 chaises plastiques', '30 tables', 'Nappes', 'Eclairage LED', 'Groupe electrogene']) as any,
      duration: '48 heures',
      priceMin: 600000,
      priceMax: 900000,
      currency: 'FCFA',
      isActive: true,
    })

    // ============================================
    // 4. DISPONIBILITES
    // ============================================

    await Availability.create({
      providerId: provider1.id,
      days: JSON.stringify(['Vendredi', 'Samedi', 'Dimanche']) as any,
      slots: JSON.stringify(['18h-00h', '20h-04h']) as any,
      urgentAvailable: true,
    })
    await Availability.create({
      providerId: provider2.id,
      days: JSON.stringify(['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']) as any,
      slots: JSON.stringify(['8h-12h', '14h-18h', '16h-20h']) as any,
      urgentAvailable: false,
    })
    await Availability.create({
      providerId: provider3.id,
      days: JSON.stringify(['Samedi', 'Dimanche']) as any,
      slots: JSON.stringify(['10h-18h', '14h-22h']) as any,
      urgentAvailable: true,
    })
    await Availability.create({
      providerId: provider7.id,
      days: JSON.stringify(['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']) as any,
      slots: JSON.stringify(['9h-17h']) as any,
      urgentAvailable: false,
    })

    // ============================================
    // 5. EVENEMENTS
    // ============================================

    const event1 = await Event.create({
      organizerId: provUser7.id,
      title: 'Cotonou Music Festival 2026',
      description: 'Le plus grand festival de musique du Benin. Artistes locaux et internationaux, food court, village artisanal. 2 scenes, 15 artistes.',
      eventDate: DateTime.fromISO('2026-04-12T18:00:00'),
      eventType: 'festival',
      location: 'Stade de l\'Amitie, Cotonou',
      city: 'Cotonou',
      ticketPrice: 5000,
      ticketCount: 2000,
      ticketsSold: 350,
      isPublic: true,
      isApproved: true,
      status: 'upcoming',
    })

    const event2 = await Event.create({
      organizerId: provUser7.id,
      title: 'Gala des Entrepreneurs du Benin',
      description: 'Soiree de gala reunissant les entrepreneurs et startups du Benin. Networking, pitchs, remise de prix. Dress code: tenue de soiree.',
      eventDate: DateTime.fromISO('2026-05-20T19:00:00'),
      eventType: 'gala',
      location: 'Hotel Golden Tulip, Cotonou',
      city: 'Cotonou',
      ticketPrice: 25000,
      ticketCount: 200,
      ticketsSold: 80,
      isPublic: true,
      isApproved: true,
      status: 'upcoming',
    })

    await Event.create({
      organizerId: admin.id,
      title: 'Salon du Mariage Cotonou 2026',
      description: 'Salon professionnel dedie au mariage. Rencontrez les meilleurs prestataires : decorateurs, photographes, traiteurs, DJ. Entree gratuite !',
      eventDate: DateTime.fromISO('2026-06-15T10:00:00'),
      eventType: 'mariage',
      location: 'Palais des Congres, Cotonou',
      city: 'Cotonou',
      ticketPrice: 0,
      ticketCount: 500,
      ticketsSold: 120,
      isPublic: true,
      isApproved: true,
      status: 'upcoming',
    })

    const event4 = await Event.create({
      organizerId: provUser6.id,
      title: 'Concert Carine & The Band - Live in Parakou',
      description: 'Concert live exceptionnel de Carine et son groupe. Afrobeat, Gospel et varietes. Ambiance garantie !',
      eventDate: DateTime.fromISO('2026-03-28T20:00:00'),
      eventType: 'concert',
      location: 'Espace Culturel de Parakou',
      city: 'Parakou',
      ticketPrice: 3000,
      ticketCount: 500,
      ticketsSold: 200,
      isPublic: true,
      isApproved: true,
      status: 'upcoming',
    })

    await Event.create({
      organizerId: admin.id,
      title: 'Journee Portes Ouvertes NOLVA',
      description: 'Decouvrez la plateforme NOLVA et rencontrez nos prestataires partenaires. Demonstrations, echanges, et surprises.',
      eventDate: DateTime.fromISO('2026-03-15T09:00:00'),
      eventType: 'networking',
      location: 'Espace Dantokpa, Cotonou',
      city: 'Cotonou',
      ticketPrice: 0,
      ticketCount: 300,
      ticketsSold: 45,
      isPublic: true,
      isApproved: true,
      status: 'upcoming',
    })

    // ============================================
    // 6. DEMANDES DE DEVIS
    // ============================================

    await QuoteRequest.create({
      userId: user1.id,
      providerId: provider1.id,
      eventType: 'mariage',
      eventDate: DateTime.fromISO('2026-05-10'),
      location: 'Cotonou',
      budget: 300000,
      message: 'Bonjour, je prepare mon mariage pour mai 2026. Je cherche un DJ pour la reception (environ 200 invites). Pouvez-vous me faire un devis pour votre Pack Mariage ?',
      status: 'pending',
    })

    const quote2 = await QuoteRequest.create({
      userId: user1.id,
      providerId: provider2.id,
      eventType: 'mariage',
      eventDate: DateTime.fromISO('2026-05-10'),
      location: 'Cotonou',
      budget: 450000,
      message: 'Bonjour Grace Photo, je cherche un photographe + videaste pour mon mariage le 10 mai. Pack complet avec drone si possible.',
      status: 'accepted',
    })

    const quote3 = await QuoteRequest.create({
      userId: user2.id,
      providerId: provider3.id,
      eventType: 'anniversaire',
      eventDate: DateTime.fromISO('2026-04-22'),
      location: 'Porto-Novo',
      budget: 150000,
      message: 'Je celebre mes 30 ans et je cherche un animateur pour une fete d\'environ 80 personnes a Porto-Novo. Budget 150 000 FCFA.',
      status: 'accepted',
    })

    await QuoteRequest.create({
      userId: user3.id,
      providerId: provider8.id,
      eventType: 'mariage',
      eventDate: DateTime.fromISO('2026-06-01'),
      location: 'Calavi',
      budget: 400000,
      message: 'Nous organisons un mariage de 250 invites a Calavi. Il nous faut des tentes, chaises, tables et eclairage. Merci de nous faire un devis.',
      status: 'pending',
    })

    await QuoteRequest.create({
      userId: user2.id,
      providerId: provider7.id,
      eventType: 'conference',
      eventDate: DateTime.fromISO('2026-07-10'),
      location: 'Cotonou',
      budget: 1000000,
      message: 'Organisation complete d\'une conference de 150 participants sur 2 jours. Lieu, traiteur, technique, accueil.',
      status: 'declined',
    })

    // ============================================
    // 7. RESERVATIONS
    // ============================================

    await Reservation.create({
      quoteRequestId: quote2.id,
      userId: user1.id,
      providerId: provider2.id,
      totalAmount: 400000,
      depositAmount: 120000,
      currency: 'FCFA',
      status: 'confirmed',
      paymentStatus: 'deposit_paid',
      fedapayTransactionId: 'fdp_test_001',
    })

    await Reservation.create({
      quoteRequestId: quote3.id,
      userId: user2.id,
      providerId: provider3.id,
      totalAmount: 150000,
      depositAmount: 45000,
      currency: 'FCFA',
      status: 'confirmed',
      paymentStatus: 'deposit_paid',
      fedapayTransactionId: 'fdp_test_002',
    })

    await Reservation.create({
      userId: user3.id,
      providerId: provider1.id,
      totalAmount: 120000,
      depositAmount: 36000,
      currency: 'FCFA',
      status: 'pending',
      paymentStatus: 'unpaid',
    })

    // ============================================
    // 8. BILLETS
    // ============================================

    await Ticket.create({
      eventId: event1.id,
      userId: user1.id,
      type: 'standard',
      amount: 5000,
      qrCode: 'NOLVA-EVT1-TK001',
      status: 'valid',
    })

    await Ticket.create({
      eventId: event1.id,
      userId: user2.id,
      type: 'vip',
      amount: 15000,
      qrCode: 'NOLVA-EVT1-TK002',
      status: 'valid',
    })

    await Ticket.create({
      eventId: event4.id,
      userId: user1.id,
      type: 'standard',
      amount: 3000,
      qrCode: 'NOLVA-EVT4-TK001',
      status: 'valid',
    })

    await Ticket.create({
      eventId: event2.id,
      userId: user3.id,
      type: 'standard',
      amount: 25000,
      qrCode: 'NOLVA-EVT2-TK001',
      status: 'valid',
    })

    console.log('===========================================')
    console.log('  SEEDING TERMINE AVEC SUCCES !')
    console.log('===========================================')
    console.log('')
    console.log('COMPTES DE TEST :')
    console.log('-------------------------------------------')
    console.log('ADMIN     : admin@nolva.bj / password123')
    console.log('USER      : koffi@test.com / password123')
    console.log('USER 2    : amina@test.com / password123')
    console.log('PROVIDER  : dj.flash@test.com / password123')
    console.log('PROVIDER  : grace.photo@test.com / password123')
    console.log('-------------------------------------------')
    console.log(`${8} prestataires crees`)
    console.log(`${18} offres creees`)
    console.log(`${5} evenements crees`)
    console.log(`${5} demandes de devis creees`)
    console.log(`${3} reservations creees`)
    console.log(`${4} billets crees`)
    console.log('===========================================')
  }
}
