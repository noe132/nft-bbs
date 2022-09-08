import classNames from 'classnames';
import { useNavigate } from 'react-router-dom';
import { Button, ButtonProps } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

export const BackButton = (props: ButtonProps) => {
  const { className, ...restProps } = props;
  const navigate = useNavigate();
  return (
    <Button
      className={classNames(
        'rounded-full h-12 w-12 min-w-0 p-0 flex-center text-white',
        className,
      )}
      color="inherit"
      variant="outlined"
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
      {...restProps}
    >
      <ArrowBack className="text-26" />
    </Button>
  );
};
