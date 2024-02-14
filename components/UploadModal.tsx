import useUploadModal from '@/hooks/useUploadModal';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useState } from 'react';
import { FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import uniqid from 'uniqid';

import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import Button from './Button';
import Input from './Input';
import Modal from './Modal';

const UploadModal = () => {
  const uploadModal = useUploadModal();
  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabaseClient = useSupabaseClient();
  const { register, reset, handleSubmit } = useForm<FieldValues>({
    defaultValues: {
      title: '',
      author: '',
      song: null,
      image: null,
    },
  });

  const onChange = (open: boolean) => {
    if (!open) {
      reset();
      uploadModal.onClose();
    }
  };

  const onSubmit: SubmitHandler<FieldValues> = async (values) => {
    try {
      setIsLoading(true);
      const uniqueId = uniqid();
      const songFile = values.song?.[0];
      const imageFile = values.image?.[0];

      if (!songFile || !imageFile || !user) {
        toast.error('Missing fields');
        return;
      }
      //store the song
      const { data: songData, error: songError } = await supabaseClient.storage
        .from('songs')
        .upload(`song-${values.title}-${uniqueId}`, songFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (songError) {
        setIsLoading(false);
        return toast.error('Error uploading song');
      }

      //store the image
      const { data: imageData, error: imageError } =
        await supabaseClient.storage
          .from('images')
          .upload(`image-${values.title}-${uniqueId}`, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

      if (imageError) {
        setIsLoading(false);
        return toast.error('Error uploading image');
      }

      //store the data
      const { error: supabaseError } = await supabaseClient
        .from('songs')
        .insert({
          user_id: user.id,
          title: values.title,
          author: values.author,
          song_path: songData.path,
          image_path: imageData.path,
        });

      if (supabaseError) {
        setIsLoading(false);
        return toast.error(supabaseError.message);
      }

      router.refresh();
      setIsLoading(false);
      toast.success('Song uploaded!');
      reset();
      uploadModal.onClose();
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title='Add a song'
      description='Upload an mp3 file.'
      isOpen={uploadModal.isOpen}
      onChange={onChange}
    >
      <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-y-4'>
        <Input
          id='title'
          placeholder='Song title'
          disabled={isLoading}
          {...register('title', { required: true })}
        />
        <Input
          id='author'
          placeholder='Song author'
          disabled={isLoading}
          {...register('author', { required: true })}
        />
        <div>
          <div className='pb-1'>
            Select a song file
            <Input
              id='song'
              disabled={isLoading}
              type='file'
              accept='.mp3'
              {...register('song', { required: true })}
            />
          </div>
        </div>
        <div>
          <div className='pb-1'>
            Select an image
            <Input
              id='image'
              disabled={isLoading}
              type='file'
              accept='image/*'
              {...register('image', { required: true })}
            />
          </div>
        </div>
        <Button className='rounded-md' disabled={isLoading} type='submit'>
          Create
        </Button>
      </form>
    </Modal>
  );
};

export default UploadModal;
