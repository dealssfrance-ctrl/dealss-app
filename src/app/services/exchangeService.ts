import { supabase } from './supabaseClient';

export type ExchangeStatus = 'pending' | 'confirmed' | 'disputed';

export interface Exchange {
  id: string;
  offerId: string;
  participantAId: string;
  participantBId: string;
  participantAConfirmed: boolean;
  participantBConfirmed: boolean;
  status: ExchangeStatus;
  createdAt: string;
  confirmedAt?: string;
}

function toExchange(row: any): Exchange {
  return {
    id: row.id,
    offerId: row.offer_id,
    participantAId: row.participant_a_id,
    participantBId: row.participant_b_id,
    participantAConfirmed: Boolean(row.participant_a_confirmed),
    participantBConfirmed: Boolean(row.participant_b_confirmed),
    status: row.status,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at || undefined,
  };
}

/** Always order participant ids so (a < b). Returns [aId, bId, meIsA]. */
function orderParticipants(meId: string, otherId: string): {
  aId: string;
  bId: string;
  meIsA: boolean;
} {
  const meIsA = meId < otherId;
  return {
    aId: meIsA ? meId : otherId,
    bId: meIsA ? otherId : meId,
    meIsA,
  };
}

export const exchangeService = {
  /** Find the exchange between two users for a given offer (if any). */
  async findExchange(offerId: string, meId: string, otherId: string): Promise<Exchange | null> {
    const { aId, bId } = orderParticipants(meId, otherId);
    const { data, error } = await supabase
      .from('exchanges')
      .select('*')
      .eq('offer_id', offerId)
      .eq('participant_a_id', aId)
      .eq('participant_b_id', bId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toExchange(data) : null;
  },

  /**
   * Confirms the exchange for the current user. Creates the row if it doesn't
   * exist yet, then sets the appropriate confirmation flag.
   */
  async confirmExchange(
    offerId: string,
    meId: string,
    otherId: string,
  ): Promise<Exchange> {
    const { aId, bId, meIsA } = orderParticipants(meId, otherId);

    // Try to insert (creates row if missing). On unique conflict, ignore.
    const insertPayload: Record<string, unknown> = {
      offer_id: offerId,
      participant_a_id: aId,
      participant_b_id: bId,
      participant_a_confirmed: meIsA,
      participant_b_confirmed: !meIsA,
    };
    const { error: insertError } = await supabase
      .from('exchanges')
      .insert(insertPayload);

    // 23505 = unique violation: row already exists, fall through to update.
    if (insertError && (insertError as any).code !== '23505') {
      throw new Error(insertError.message);
    }

    if (insertError && (insertError as any).code === '23505') {
      const updatePayload = meIsA
        ? { participant_a_confirmed: true }
        : { participant_b_confirmed: true };
      const { error: updateError } = await supabase
        .from('exchanges')
        .update(updatePayload)
        .eq('offer_id', offerId)
        .eq('participant_a_id', aId)
        .eq('participant_b_id', bId);
      if (updateError) throw new Error(updateError.message);
    }

    const exchange = await this.findExchange(offerId, meId, otherId);
    if (!exchange) throw new Error('Exchange introuvable après confirmation');
    return exchange;
  },

  /**
   * Reports a problem with the exchange. Creates the exchange row first if
   * necessary (so a user can report even before any confirmation has occurred).
   */
  async reportExchange(
    offerId: string,
    meId: string,
    otherId: string,
    reason?: string,
  ): Promise<void> {
    const { aId, bId } = orderParticipants(meId, otherId);

    // Ensure an exchange row exists (without confirming).
    let exchange = await this.findExchange(offerId, meId, otherId);
    if (!exchange) {
      const { error: insertError } = await supabase.from('exchanges').insert({
        offer_id: offerId,
        participant_a_id: aId,
        participant_b_id: bId,
      });
      if (insertError && (insertError as any).code !== '23505') {
        throw new Error(insertError.message);
      }
      exchange = await this.findExchange(offerId, meId, otherId);
      if (!exchange) throw new Error('Impossible de créer le signalement');
    }

    const { error: reportError } = await supabase.from('exchange_reports').insert({
      exchange_id: exchange.id,
      reporter_id: meId,
      reported_id: otherId,
      reason: reason || null,
    });
    if (reportError) {
      // 23505 = duplicate report from same reporter for same exchange.
      if ((reportError as any).code === '23505') {
        throw new Error('Vous avez déjà signalé cet échange');
      }
      throw new Error(reportError.message);
    }
  },

  /** Helper: returns whether `meId` is participant A in this exchange. */
  meIsParticipantA(exchange: Exchange, meId: string): boolean {
    return exchange.participantAId === meId;
  },

  /** Did the current user already confirm? */
  hasUserConfirmed(exchange: Exchange, meId: string): boolean {
    return this.meIsParticipantA(exchange, meId)
      ? exchange.participantAConfirmed
      : exchange.participantBConfirmed;
  },

  /** Did the OTHER user confirm? */
  hasOtherConfirmed(exchange: Exchange, meId: string): boolean {
    return this.meIsParticipantA(exchange, meId)
      ? exchange.participantBConfirmed
      : exchange.participantAConfirmed;
  },
};
