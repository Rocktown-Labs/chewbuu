import { z } from "zod";

const tipBeneficiaryKindSchema = z.enum(["cook", "house", "server"]);

export type TipBeneficiaryKind = z.infer<typeof tipBeneficiaryKindSchema>;

export interface SettlementSplit {
  amountCents: number;
  beneficiaryKind: TipBeneficiaryKind;
  beneficiaryUserId?: string;
}

export interface SettlementTotals {
  platformFeeCents: number;
  venueCents: number;
  workerTipCents: number;
}

export const calculatePlatformFee = (
  commissionableCents: number,
  feeBps: number
) => Math.floor((commissionableCents * feeBps) / 10_000);

export const calculateSettlement = (input: {
  feeBps: number;
  subtotalCents: number;
  taxCents: number;
  tipAllocations: SettlementSplit[];
}) => {
  const platformFeeCents = calculatePlatformFee(
    input.subtotalCents,
    input.feeBps
  );
  const venueTipCents = input.tipAllocations
    .filter((allocation) => allocation.beneficiaryKind === "house")
    .reduce((total, allocation) => total + allocation.amountCents, 0);
  const workerTipCents = input.tipAllocations
    .filter((allocation) => allocation.beneficiaryKind !== "house")
    .reduce((total, allocation) => total + allocation.amountCents, 0);

  return {
    platformFeeCents,
    venueCents:
      input.subtotalCents + input.taxCents + venueTipCents - platformFeeCents,
    workerTipCents,
  } satisfies SettlementTotals;
};
