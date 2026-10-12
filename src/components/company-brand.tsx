import nvidia from "@/assets/nvidia.svg.asset.json";
import apple from "@/assets/apple.svg.asset.json";
import microsoft from "@/assets/microsoft.svg.asset.json";
import amazon from "@/assets/amazon.svg.asset.json";
import meta from "@/assets/meta.svg.asset.json";
import tesla from "@/assets/tesla.svg.asset.json";
import type { Symbol } from "@/lib/markets";

const logos = { NVDA: nvidia, AAPL: apple, MSFT: microsoft, AMZN: amazon, META: meta, TSLA: tesla };

export function CompanyBrand({ symbol, name }: { symbol: Symbol; name: string }) {
  return <div className="company-brand flex min-w-0 items-center justify-center gap-1.5">
    {symbol !== "GOOGL" && <img className="company-logo h-5 w-5 shrink-0 object-contain xl:h-7 xl:w-7" src={logos[symbol].url} alt="" aria-hidden="true" />}
    <span className="min-w-0 font-display text-lg font-semibold md:text-sm xl:text-lg">{name}</span>
  </div>;
}