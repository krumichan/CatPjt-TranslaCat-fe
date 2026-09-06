import { ListeningLandingPage } from "@/components/language-learning/listening/landing/ListeningLandingPage";

/**
 * Legacy direct-entry route.
 *
 * Listening now starts from a practice-mode selector. Keeping this route mapped
 * to the landing page prevents old bookmarks/links from bypassing the mode
 * selection flow and generating a Daily Set implicitly.
 */
export default function ListeningSetupRoutePage() {
    return <ListeningLandingPage />;
}
