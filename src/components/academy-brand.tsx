import investicoMark from "@/assets/investico-mark.png";

export function AcademyBrand() {
  return <span className="academy-brand inline-flex min-w-0 items-center gap-2.5">
    <img src={investicoMark} width={1024} height={1024} alt="" className="h-11 w-9 shrink-0 object-contain" />
    <span className="min-w-0">
      <span className="academy-wordmark block font-display text-xl font-semibold uppercase leading-none">Investico<span className="academy-seal" aria-hidden="true">◆</span></span>
      <span className="academy-submark mt-1.5 block text-[9px] font-medium uppercase leading-none">Academy</span>
    </span>
  </span>;
}