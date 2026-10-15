import Image from "next/image";

interface BrandWordmarkProps {
    alt?: string;
    className: string;
    priority?: boolean;
}

export default function BrandWordmark({
    alt = "",
    className,
    priority = false,
}: BrandWordmarkProps) {
    return (
        <span
            className={`relative inline-block aspect-[9/2] shrink-0 overflow-hidden align-middle ${className}`}
        >
            {/* 투명 로고를 공통으로 사용해 테마에 관계없이 헤더 배경을 그대로 드러냅니다. */}
            <Image
                src="/images/translacat-wordmark-light.png"
                alt={alt}
                width={2168}
                height={725}
                sizes="(min-width: 640px) 264px, 174px"
                priority={priority}
                className="absolute top-[-18%] left-[-2%] h-auto w-[105%] max-w-none"
            />

            {/* 다크 모드에서는 앞 글자 영역만 흰색으로 덮고 파란 고양이와 꼬리는 보존합니다. */}
            <Image
                src="/images/translacat-wordmark-light.png"
                alt=""
                aria-hidden="true"
                width={2168}
                height={725}
                sizes="(min-width: 640px) 264px, 174px"
                priority={priority}
                className="absolute top-[-18%] left-[-2%] hidden h-auto w-[105%] max-w-none brightness-0 invert dark:block"
                style={{ clipPath: "inset(0 44.7% 0 0)" }}
            />
        </span>
    );
}
