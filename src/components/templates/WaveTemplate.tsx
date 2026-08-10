
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { inkOn, mutedInkOn, readableAccent } from '../../utils/templateInk';

export const WaveTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="bg-white text-gray-800 relative" style={bodyStyle}>
       <div className="absolute top-0 left-0 w-full h-48" style={{backgroundColor: themeColor, color: inkOn(themeColor), clipPath: 'ellipse(100% 55% at 40% 45%)'}}></div>
      <div className="relative p-8 z-10">
        <header className="mb-16 ml-4">
            <div className="flex gap-2">
                <InlineEdit 
                    value={personalDetails.firstName} 
                    fieldId="personalDetails.firstName" 
                    onFocus={onFocus} 
                    className="text-5xl font-extrabold" 
                    style={{ ...titleStyle, color: inkOn(themeColor) }}
                    tagName="h1"
                    placeholder="First Name"
                />
                <InlineEdit 
                    value={personalDetails.lastName} 
                    fieldId="personalDetails.lastName" 
                    onFocus={onFocus} 
                    className="text-5xl font-extrabold" 
                    style={{ ...titleStyle, color: inkOn(themeColor) }}
                    tagName="h1"
                    placeholder="Last Name"
                />
            </div>
            <InlineEdit 
                value={personalDetails.jobTitle} 
                fieldId="personalDetails.jobTitle" 
                onFocus={onFocus} 
                className="text-2xl font-light mt-1 block" 
                style={{ ...titleStyle, color: mutedInkOn(themeColor) }}
                tagName="h2"
                placeholder="Job Title"
            />
            <div className="text-sm mt-2 flex gap-1" style={{color: mutedInkOn(themeColor)}}>
                <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
                <span>|</span>
                <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
            </div>
        </header>

        <main className="grid grid-cols-3 gap-8">
            <div className="col-span-2">
                <section className="mb-6">
                    <h3 className="text-xl font-bold mb-2" style={{...titleStyle, color: readableAccent(themeColor)}}>Summary</h3>
                    <InlineEdit 
                        value={professionalSummary} 
                        fieldId="professionalSummary" 
                        onFocus={onFocus} 
                        className="text-sm leading-relaxed block whitespace-pre-wrap"
                        tagName="p"
                        placeholder="Summary..."
                    />
                </section>
                <section>
                    <h3 className="text-xl font-bold mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Experience</h3>
                    {employmentHistory.map((job, index) => (
                        <div key={job.id} className="mb-4">
                            <InlineEdit 
                                value={job.jobTitle} 
                                fieldId={`employmentHistory[${index}].jobTitle`} 
                                onFocus={onFocus} 
                                className="text-lg font-semibold block" 
                                style={titleStyle}
                                tagName="h4"
                                placeholder="Job Title"
                            />
                            <div className="text-sm text-gray-600 flex gap-1">
                                <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                                <span>|</span>
                                <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                                <span>-</span>
                                <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                            </div>
                            <InlineEdit 
                                value={job.description} 
                                fieldId={`employmentHistory[${index}].description`} 
                                onFocus={onFocus} 
                                className="text-sm mt-1 whitespace-pre-wrap block"
                                tagName="p"
                                placeholder="Description..."
                            />
                        </div>
                    ))}
                </section>
            </div>
            <aside className="col-span-1">
                 <section className="mb-6">
                    <h3 className="text-xl font-bold mb-2" style={{...titleStyle, color: readableAccent(themeColor)}}>Skills</h3>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                        {skills.map((skill, index) => (
                            <li key={skill.id}>
                                <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                            </li>
                        ))}
                    </ul>
                </section>
                <section>
                    <h3 className="text-xl font-bold mb-2" style={{...titleStyle, color: readableAccent(themeColor)}}>Education</h3>
                     {education.map((edu, index) => (
                        <div key={edu.id} className="mb-2">
                            <InlineEdit 
                                value={edu.degree} 
                                fieldId={`education[${index}].degree`} 
                                onFocus={onFocus} 
                                className="font-semibold text-sm block" 
                                style={titleStyle}
                                tagName="h4"
                                placeholder="Degree"
                            />
                            <InlineEdit 
                                value={edu.school} 
                                fieldId={`education[${index}].school`} 
                                onFocus={onFocus} 
                                className="text-xs italic block" 
                                tagName="p"
                                placeholder="School"
                            />
                        </div>
                    ))}
                </section>
            </aside>
        </main>
      </div>
    </div>
  );
};
