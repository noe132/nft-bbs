import classNames from 'classnames';
import { Button, ButtonProps } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { viewService } from '~/service';

export const BackButton = (props: ButtonProps) => {
  const { className, ...restProps } = props;
  return (
    <Button
      className={classNames(
        'rounded-full h-12 w-12 min-w-0 p-0 flex-center text-white',
        className,
      )}
      color="inherit"
      variant="outlined"
      onClick={viewService.back}
      {...restProps}
    >
      <ArrowBack className="text-26" />
    </Button>
  );
};
