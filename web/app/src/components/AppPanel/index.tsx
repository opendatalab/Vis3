import ArrowRightOutlined from '@/assets/arrow-right.svg?react';
import ToolboxSvg from '@/assets/toolbox.svg?react';
import { useTranslation } from '@visu/i18n';
import { useMemo } from 'react';
import Button from '../Button';
import Popover from '../Popover';
import styles from './index.module.css';
import LabelLLM from './labelllm.svg?react';
import MinerU from './mineru.svg?react';
import OpenDataLab from './opendatalab.svg?react';
interface AppLink {
  name: string;
  links: {
    name: string;
    link: string;
  }[];
  icon: JSX.Element;
  description: string;
}

export default function AppPanel() {
  const { t } = useTranslation();
  const handleGoApp = (app: AppLink) => {
    window.open(app.links[0].link, '_blank');
  };

  const apps = useMemo(
    () => [
      {
        name: 'OpenDataLab',
        links: [{ name: t('goTo'), link: 'https://opendatalab.com' }],
        icon: <OpenDataLab />,
        description: t('opendatalabDescription'),
      },
      {
        name: 'LabelLLM',
        links: [
          {
            name: 'Github',
            link: 'https://github.com/opendatalab/LabelLLM?tab=readme-ov-file#labelllm-the-open-source-data-annotation-platform',
          },
        ],
        icon: <LabelLLM />,
        description: t('labelllmDescription'),
      },
      {
        name: 'MinerU',
        links: [
          { name: 'Github', link: 'https://github.com/opendatalab/MinerU' },
          { name: t('tryOnline'), link: 'https://opendatalab.com/OpenSourceTools/Extractor/PDF' },
        ],
        icon: <MinerU />,
        description: t('minerUDescription'),
      },
    ],
    [t],
  );

  return (
    <Popover
      trigger={<Button size="sm" variant="ghost" leftIcon={<ToolboxSvg />}>{t('openSourceToolbox')}</Button>}
      placement="bottomRight"
      triggerMode="hover"
    >
      <div className='p-4'>
        <div className={styles.title}>{t('toolboxWelcome')}</div>
        <div className={styles.panel}>
          {apps.map((app) => {
            return (
              <div key={app.name} className={styles.appWrapper}>
                <div className={styles.appContainer}>
                  <div className={styles.header} onClick={() => handleGoApp(app)}>
                    <div className="text-3xl">

                    {app.icon}
                    </div>
                    <div className={styles.appInfo}>
                      {app.name}
                      <div className="text-sm text-gray-500">{app.description}</div>
                    </div>
                  </div>
                  <div className={styles.links}>
                    {app.links.map((link) => {
                      return (
                        <a href={link.link} key={link.name} target="_blank" rel="noreferrer" className={styles.link}>
                          {link.name}
                          <ArrowRightOutlined className={styles.arrow} />
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Popover>
  );
}
