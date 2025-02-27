import Heading from '@theme/Heading';
import clsx from 'clsx';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Model-first',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: <>Define your model, generate everything else.</>,
  },
  {
    title: 'CLI',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: <>Generate things with our cli.</>,
  },
  {
    title: 'Brought to you by smartive',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: <>We developed this as an internal tool.</>,
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
