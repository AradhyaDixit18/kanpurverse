import { notFound } from "next/navigation";
import AssetReview from "./AssetReview";
export default function Page() { if(process.env.NODE_ENV!=="development")notFound();return <AssetReview />; }
