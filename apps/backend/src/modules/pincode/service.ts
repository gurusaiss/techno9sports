import { MedusaService } from "@medusajs/framework/utils"
import Pincode from "./models/pincode"

class PincodeModuleService extends MedusaService({ Pincode }) {}

export default PincodeModuleService
