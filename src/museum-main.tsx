import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MuseumExperience } from './components/MuseumExperience';
import './index.css';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<MuseumExperience />
	</StrictMode>,
);
