import SettingsCard from "@/components/settings/SettingsCard";
import { SettingCard } from "@/components/settings/settingCards";

type SettingsCardGridProps = {
    cards: SettingCard[];
};

export default function SettingsCardGrid({ cards }: SettingsCardGridProps) {
    return (
        <section className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => (
                <SettingsCard key={card.href} card={card} />
            ))}
        </section>
    );
}