import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import EscrowReleaseService from '#services/escrow_release_service'

export default class ReleaseEscrow extends BaseCommand {
  static commandName = 'release:escrow'
  static description = 'Libère les fonds en séquestre dont le délai est écoulé (48h tickets / 24h prestations)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const service = new EscrowReleaseService()
    const result = await service.releaseDueTransactions()
    this.logger.info(
      `Escrow: ${result.tickets} transaction(s) billet, ${result.providers} transaction(s) prestataire libérée(s).`
    )
  }
}
