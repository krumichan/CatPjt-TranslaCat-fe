import { loader } from "fumadocs-core/source";

import { docs } from "../../../.source/server";
import { guideI18n } from "@/lib/docs/i18n";

export const guideSource = loader({
    baseUrl: "/docs",
    i18n: guideI18n,
    source: docs.toFumadocsSource(),
});
