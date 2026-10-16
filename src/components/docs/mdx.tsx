import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import type { MDXComponents } from "mdx/types";

import { GuideScreenshot } from "@/components/docs/GuideScreenshot";

export function getGuideMDXComponents(): MDXComponents {
    return { ...defaultMdxComponents, GuideScreenshot, Tab, Tabs };
}
