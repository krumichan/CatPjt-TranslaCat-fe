import {useEffect, useRef, useState} from "react";
import {GeneralTranslation, TranslationUnit} from "@/types/common";
import {SystemTranslator} from "@/components/voice/ui/SystemTranslator";
import {MicTranslator} from "@/components/voice/ui/MicTranslator";

interface SpeechToTextProps {
    groupId: string;
    t: GeneralTranslation;
    ln: (unit: TranslationUnit) => string;
    mode: 'mic' | 'system';
}

const SpeechToText = ({ groupId, t, ln, mode }: SpeechToTextProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    const [allUnits, setAllUnits] = useState<TranslationUnit[]>([]);

    const handleNewUnit = (unit: TranslationUnit) => {
        setAllUnits(prev => [...prev, unit]);
    };

    useEffect(() => {
        const scrollTimeout = setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });
            }
        }, 100);

        return () => clearTimeout(scrollTimeout);
    }, [allUnits]);

    useEffect(() => {
        const raf = requestAnimationFrame(() => {
            setMounted(true);
        });
        return () => cancelAnimationFrame(raf);
    }, []);

    if (!mounted) return null;

    return (
        <main className="flex flex-col gap-10">
            {mode === 'mic' ? (
                <MicTranslator
                    groupId={groupId}
                    t={t}
                    ln={ln}
                    scrollRef={scrollRef}
                    history={allUnits}
                    onUnitAdded={handleNewUnit}
                />
            ) : (
                <SystemTranslator
                    groupId={groupId}
                    t={t}
                    ln={ln}
                    scrollRef={scrollRef}
                    history={allUnits}
                    onUnitAdded={handleNewUnit}
                />
            )}
        </main>
    );
};

export default SpeechToText;
