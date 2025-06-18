import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

interface SuccessPopupProps {
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function SuccessPopup({ show, title, message }: SuccessPopupProps) {
  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={() => {}} 
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/50 border border-gray-700/50 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex flex-col items-center text-center">
                    <CheckCircleIcon className="h-12 w-12 text-green-400" aria-hidden="true" />
                    <Dialog.Title
                        as="h3"
                        className="mt-4 text-lg font-medium leading-6 text-white"
                    >
                        {title}
                    </Dialog.Title>
                    <div className="mt-2">
                        <p className="text-sm text-gray-400">
                        {message}
                        </p>
                    </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}