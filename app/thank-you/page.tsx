import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ThankYouPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const name = resolvedSearchParams?.name;
  const displayName = Array.isArray(name) ? name[0] : name;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-center">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-xl shadow-md">
        <h1 className="text-3xl font-bold text-green-600">提交成功！</h1>
        <p className="text-xl text-gray-800 font-medium">
          感谢您，<span className="text-blue-600">{displayName || '评测官'}</span>！
        </p>
        <p className="text-gray-700">
          您的宝贵意见已经成功提交，这对我们的研究至关重要。
        </p>
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center pt-4">
            <Link 
                href="/"
                className="inline-block px-6 py-3 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
            返回首页
            </Link>
            
            {displayName && (
                <Link 
                    href={`/my-stats?name=${encodeURIComponent(displayName)}`}
                    className="inline-block px-6 py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                查看我的评测报告(计算需要等待十几秒，请稍等)
                </Link>
            )}
        </div>
      </div>
    </main>
  );
}
