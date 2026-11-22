import SettingsLayout from '@app/components/Settings/SettingsLayout';
import SettingsSeerrPlus from '@app/components/Settings/SettingsSeerrPlus';
import useRouteGuard from '@app/hooks/useRouteGuard';
import { Permission } from '@app/hooks/useUser';
import type { NextPage } from 'next';

const SettingsSeerrPlusPage: NextPage = () => {
  useRouteGuard(Permission.ADMIN);
  return (
    <SettingsLayout>
      <SettingsSeerrPlus />
    </SettingsLayout>
  );
};

export default SettingsSeerrPlusPage;
