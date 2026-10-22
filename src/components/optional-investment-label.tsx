export function OptionalInvestmentLabel({ children }: { children: React.ReactNode }) {
  return <span className="optional-investment-label"><span>{children}</span><small>optional</small></span>;
}