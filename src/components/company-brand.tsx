export function CompanyBrand({ name }: { name: string }) {
  return <div className="company-brand flex min-w-0 items-center justify-center">
    <span className="min-w-0 font-display text-lg font-semibold md:text-sm xl:text-lg">{name}</span>
  </div>;
}
