import type { AvailableLocale } from '@server/types/languages';

export const isPortugueseLocale = (locale?: string | null) =>
  locale?.toLowerCase().startsWith('pt') ?? false;

export const getEmailLabels = (locale?: AvailableLocale | string | null) => {
  const portuguese = isPortugueseLocale(locale);

  return portuguese
    ? {
        greeting: 'Olá',
        openApplication: 'Abrir',
        openInApplication: 'Abrir no',
        requestedBy: 'Pedido por',
        viewIssue: 'Ver problema no',
        resetPassword: 'Redefinir palavra-passe',
        resetPasswordBody:
          'Foi recebido um pedido para alterar a palavra-passe da tua conta em {applicationTitle}.',
        resetPasswordExpiry: 'O link acima expira dentro de 24 horas.',
        resetPasswordIgnore:
          'Se não foste tu a iniciar este pedido, podes ignorar esta mensagem.',
        generatedPasswordBody:
          'Foi criada uma conta para ti em {applicationTitle}.',
        generatedPasswordValue: 'A tua palavra-passe é:',
        accountInformationSubject: 'Informação da conta',
        passwordResetSubject: 'Redefinição de palavra-passe',
        testNotificationSubject: 'Notificação de teste',
        mediaPendingSubject: 'Pedido pendente',
        mediaApprovedSubject: 'Pedido aprovado',
        mediaAvailableSubject: 'Pedido disponível',
        mediaFailedSubject: 'Pedido falhou',
        mediaDeclinedSubject: 'Pedido recusado',
        mediaAutoApprovedSubject: 'Pedido aprovado automaticamente',
        mediaAutoRequestedSubject: 'Pedido automático submetido',
        issueCreatedSubject: 'Problema reportado',
        issueCommentSubject: 'Comentário no problema',
        issueResolvedSubject: 'Problema resolvido',
        issueReopenedSubject: 'Problema reaberto',
      }
    : {
        greeting: 'Hi',
        openApplication: 'Open',
        openInApplication: 'Open in',
        requestedBy: 'Requested By',
        viewIssue: 'View Issue in',
        resetPassword: 'Reset Password',
        resetPasswordBody:
          'A request has been received to change the password for your {applicationTitle} account.',
        resetPasswordExpiry: 'The above link will expire in 24 hours.',
        resetPasswordIgnore:
          'If you did not initiate this request, you may safely disregard this message.',
        generatedPasswordBody:
          'An account has been created for you at {applicationTitle}.',
        generatedPasswordValue: 'Your password is:',
        accountInformationSubject: 'Account Information',
        passwordResetSubject: 'Password Reset',
        testNotificationSubject: 'Test Notification',
        mediaPendingSubject: 'Request Pending',
        mediaApprovedSubject: 'Request Approved',
        mediaAvailableSubject: 'Request Available',
        mediaFailedSubject: 'Request Failed',
        mediaDeclinedSubject: 'Request Declined',
        mediaAutoApprovedSubject: 'Request Automatically Approved',
        mediaAutoRequestedSubject: 'Request Automatically Submitted',
        issueCreatedSubject: 'Issue Reported',
        issueCommentSubject: 'Issue Comment',
        issueResolvedSubject: 'Issue Resolved',
        issueReopenedSubject: 'Issue Reopened',
      };
};

export type EmailLabels = ReturnType<typeof getEmailLabels>;
