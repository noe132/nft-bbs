import { observer } from 'mobx-react-lite';
import { modalViewState } from './modalViewState';

export const ModalViews = observer(() => (<>
  {modalViewState.list.map((v) => v.children)}
</>));
