import { useRouter as useNextRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export const useAppRouter = () => {
    const nextRouter = useNextRouter();
    const locale = useLocale();

    const getLocalizedPath = (path: string) => {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `/${locale}${cleanPath}`.replace(/\/+/g, '/');
    };

    const push = (path: string) => {
        nextRouter.push(getLocalizedPath(path));
    };

    const replace = (path: string) => {
        nextRouter.replace(getLocalizedPath(path));
    };

    return { ...nextRouter, push, replace };
};