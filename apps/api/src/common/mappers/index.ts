export { fullName, companyDisplayName } from "./names";
export { toNumber } from "./decimal";
export { flattenTags, type TagRef, type TagJunction } from "./tags";
export {
  toContactResponse,
  type ContactMapperInput,
  type ContactResponse,
} from "./contact.mapper";
export {
  toCompanyResponse,
  type CompanyMapperInput,
  type CompanyResponse,
} from "./company.mapper";
export {
  toDealResponse,
  type DealMapperInput,
  type DealResponse,
} from "./deal.mapper";
export {
  toPipelineResponse,
  toPipelineStageResponse,
  type PipelineMapperInput,
  type PipelineResponse,
  type PipelineStageMapperInput,
  type PipelineStageResponse,
} from "./pipeline.mapper";
