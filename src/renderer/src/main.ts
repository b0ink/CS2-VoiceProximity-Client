import { mount } from 'svelte';
import Root from './Root.svelte';
import './assets/main.css';

const app = mount(Root, {
  target: document.getElementById('app')!,
});

export default app;
