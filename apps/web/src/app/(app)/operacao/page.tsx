import { BetaOperationPage } from "@/components/crm/beta/beta-operation-page";
import { OperationPage } from "@/components/crm/operation/operation-page";
import { BETA_SINGLE_PIPELINE_MODE } from "@/lib/beta-config";

export default function OperacaoRoutePage() {
  if (BETA_SINGLE_PIPELINE_MODE) {
    return <BetaOperationPage />;
  }
  return <OperationPage />;
}
