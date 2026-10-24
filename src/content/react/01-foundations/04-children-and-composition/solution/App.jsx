import { Card } from './Card';
import { Layout } from './Layout';

export default function App() {
  return (
    <Layout sidebar={<nav>Menu</nav>}>
      <Card title="Welcome">
        <p>Glad to see you here.</p>
      </Card>
    </Layout>
  );
}
