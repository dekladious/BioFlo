"use client";

import dynamic from "next/dynamic";

const BioFloChatPage = dynamic(() => import("@/components/BioFloChatPage"), {
  ssr: false,
});

export default BioFloChatPage;




