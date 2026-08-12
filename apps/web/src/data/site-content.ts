import { cache } from "react";
import { apiGetContent } from "@/lib/api";

export const getSiteContent = cache(apiGetContent);
