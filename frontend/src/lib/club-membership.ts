interface ClubMembershipVisibility {
  isMember?: boolean;
  isActive?: boolean;
}

export function shouldShowClubMembershipCard(clubMembership?: ClubMembershipVisibility | null) {
  return clubMembership?.isMember === true && clubMembership?.isActive === true;
}

export function formatClubDiscountPercentage(value?: string | null) {
  if (value === null || value === undefined || value === '') return '';
  const percentage = Number(value);
  if (!Number.isFinite(percentage)) return '';
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(percentage)}%`;
}
