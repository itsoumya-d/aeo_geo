import React from 'react';
import { Button } from '../../components/ui/Button';

const GoogleMark: React.FC = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] flex-shrink-0">
        <path
            fill="#EA4335"
            d="M12.24 10.285v3.879h5.395c-.238 1.249-.95 2.307-2.02 3.018l3.266 2.535c1.904-1.754 3.004-4.337 3.004-7.405 0-.711-.064-1.394-.183-2.027H12.24z"
        />
        <path
            fill="#34A853"
            d="M12 22c2.7 0 4.965-.894 6.62-2.428l-3.266-2.535c-.907.609-2.068.968-3.354.968-2.579 0-4.763-1.741-5.545-4.082H3.08v2.615A9.997 9.997 0 0 0 12 22z"
        />
        <path
            fill="#4A90E2"
            d="M6.455 13.923a5.999 5.999 0 0 1 0-3.846V7.462H3.08a9.997 9.997 0 0 0 0 9.076l3.375-2.615z"
        />
        <path
            fill="#FBBC05"
            d="M12 5.995c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.96 2.995 14.695 2 12 2A9.997 9.997 0 0 0 3.08 7.462l3.375 2.615c.782-2.341 2.966-4.082 5.545-4.082z"
        />
    </svg>
);

type GoogleAuthButtonProps = {
    onClick: () => void | Promise<void>;
    disabled?: boolean;
    children?: React.ReactNode;
};

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
    onClick,
    disabled = false,
    children = 'Continue with Google',
}) => (
    <Button
        type="button"
        size="lg"
        className="w-full h-[46px] justify-center gap-3 rounded-xl border border-[#dadce0] bg-white px-4 text-[15px] font-medium text-[#1f1f1f] shadow-[0_1px_2px_rgba(60,64,67,0.15),0_1px_3px_rgba(60,64,67,0.1)] hover:bg-[#f8f9fa] hover:text-[#1f1f1f] hover:border-[#d2e3fc] hover:shadow-[0_2px_6px_rgba(60,64,67,0.18)]"
        onClick={onClick}
        disabled={disabled}
    >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
            <GoogleMark />
        </span>
        <span className="leading-none">{children}</span>
    </Button>
);
