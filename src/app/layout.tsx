import type {Metadata} from 'next';
import './styles.css';
export const metadata:Metadata={title:'BoothCraft 3D',description:'Plan, brand, and share your exhibition booth in 3D.'};
export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
